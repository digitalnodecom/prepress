//! Prepress desktop app.
//!
//! A native window around the Prepress editor. The app bundles the `prepress`
//! binary (Tauri sidecar) and runs one server per open site:
//!
//!   prepress --data <site folder> --port <p> --host 127.0.0.1
//!
//! with PREPRESS_PARENT_PID so the server never outlives the app. There is no
//! password: the server only answers on 127.0.0.1 (see server/app.ts).
//! A "site" is just its data folder; the launcher page (ui/) lists recent ones.
//! Publishing goes to the site's publish targets (sftp://, ftps://, s3://, a folder).
//! Updates: the app checks `plugins.updater.endpoints` (tauri.conf.json) at start, every few
//! hours and from "Check for Updates…"; updates are minisign-signed (scripts/release-desktop.ts).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::{self, File},
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        Mutex,
    },
    thread::sleep,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Manager, RunEvent, State, Url, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;

const MAIN: &str = "main";

/// The server for the site that is open in the window.
struct Running {
    child: Child,
    path: PathBuf,
    port: u16,
}

#[derive(Default)]
struct AppState {
    running: Mutex<Option<Running>>,
    /// Where the current download is being saved (macOS doesn't report it on finish).
    download: Mutex<Option<PathBuf>>,
    /// An update check or install is running.
    updating: AtomicBool,
    /// The version the user said "Later" to: automatic checks don't ask again for it.
    declined: Mutex<Option<String>>,
}

#[derive(Serialize, Deserialize, Clone)]
struct SiteEntry {
    path: String,
    name: String,
    #[serde(default)]
    opened: u64,
}

#[derive(Serialize, Deserialize, Default)]
struct Config {
    #[serde(default)]
    sites: Vec<SiteEntry>,
}

#[derive(Serialize)]
struct SiteView {
    path: String,
    name: String,
    /// The folder's own name (what Rename folder changes).
    folder: String,
    opened: u64,
    /// When the draft was last saved (seconds since 1970), 0 if never.
    edited: u64,
    pages: usize,
    /// Where the site is published: its search & sharing address, else the first publish target's URL.
    address: Option<String>,
    exists: bool,
    running: bool,
}

// ---------- recent sites ----------

fn config_file(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("prepress"))
        .join("sites.json")
}

fn load_config(app: &AppHandle) -> Config {
    fs::read_to_string(config_file(app))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_config(app: &AppHandle, config: &Config) -> Result<(), String> {
    let file = config_file(app);
    if let Some(dir) = file.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(file, json).map_err(|e| e.to_string())
}

fn now() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs()).unwrap_or(0)
}

/// What the site list shows about a site folder: page count, public address, last edit.
/// deploy.json holds publish passwords: only each target's `url` is read from it.
fn site_details(path: &Path) -> (usize, Option<String>, u64) {
    let draft = path.join("draft.json");
    let edited = fs::metadata(&draft)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let json = |f: PathBuf| fs::read_to_string(f).ok().and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
    let site = json(draft);
    let pages = site.as_ref().and_then(|v| v["site"]["pages"].as_array().map(Vec::len)).unwrap_or(0);
    let is_url = |s: &&str| s.starts_with("https://") || s.starts_with("http://");
    let address = site
        .as_ref()
        .and_then(|v| v["site"]["seo"]["url"].as_str().filter(is_url).map(str::to_string))
        .or_else(|| {
            json(path.join("deploy.json")).and_then(|v| {
                v["targets"].as_array().and_then(|ts| ts.iter().find_map(|t| t["url"].as_str().filter(is_url).map(str::to_string)))
            })
        });
    (pages, address, edited)
}

fn folder_name(path: &Path) -> String {
    path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| path.display().to_string())
}

/// A name usable as a folder name on every OS (no separators, reserved characters or trailing dots).
fn clean_folder_name(name: &str) -> Result<String, String> {
    let clean: String = name
        .trim()
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() { '-' } else { c })
        .collect();
    let clean = clean.trim_matches(|c: char| c == '.' || c.is_whitespace()).to_string();
    if clean.is_empty() {
        return Err("Give it a name.".into());
    }
    Ok(clean.chars().take(80).collect())
}

/// The site's title from its draft, else the folder name.
fn site_name(path: &Path) -> String {
    fs::read_to_string(path.join("draft.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .and_then(|v| v["site"]["name"].as_str().map(str::to_string))
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_else(|| path.display().to_string()))
}

fn remember(app: &AppHandle, path: &Path) -> Result<(), String> {
    let mut config = load_config(app);
    let key = path.display().to_string();
    config.sites.retain(|s| s.path != key);
    config.sites.insert(0, SiteEntry { path: key, name: site_name(path), opened: now() });
    config.sites.truncate(30);
    save_config(app, &config)
}

// ---------- the bundled server ----------

/// The sidecar sits next to the app's executable (Contents/MacOS on macOS).
fn server_bin() -> Result<PathBuf, String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let dir = exe.parent().ok_or("No executable folder")?;
    let bin = dir.join(if cfg!(windows) { "prepress.exe" } else { "prepress" });
    if bin.exists() {
        Ok(bin)
    } else {
        Err(format!("The Prepress server is missing from the app ({}).", bin.display()))
    }
}

/// A stable port per site folder (the editor keeps its per-origin settings), or any free one.
fn port_for(path: &Path) -> u16 {
    let mut h: u32 = 0x811c9dc5;
    for b in path.to_string_lossy().bytes() {
        h ^= b as u32;
        h = h.wrapping_mul(0x01000193);
    }
    let preferred = 41000 + (h % 8000) as u16;
    if TcpListener::bind(("127.0.0.1", preferred)).is_ok() {
        return preferred;
    }
    TcpListener::bind(("127.0.0.1", 0))
        .and_then(|l| l.local_addr())
        .map(|a| a.port())
        .unwrap_or(preferred)
}

/// True when a Prepress server answers on the port.
fn healthy(port: u16) -> bool {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let Ok(mut s) = TcpStream::connect_timeout(&addr, Duration::from_millis(300)) else {
        return false;
    };
    let _ = s.set_read_timeout(Some(Duration::from_secs(2)));
    if s.write_all(b"GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n").is_err() {
        return false;
    }
    let mut body = String::new();
    let _ = s.read_to_string(&mut body);
    body.starts_with("HTTP/1.1 200") && body.contains("\"server\":true")
}

fn log_file(app: &AppHandle) -> PathBuf {
    app.path()
        .app_log_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("prepress"))
        .join("server.log")
}

fn log_tail(file: &Path) -> String {
    let text = fs::read_to_string(file).unwrap_or_default();
    // Keep the error message: drop stack frames and the runtime banner, which say nothing to a user.
    let lines: Vec<&str> = text
        .lines()
        .map(str::trim)
        .filter(|l| !l.is_empty() && !l.starts_with("at ") && !l.starts_with("Bun v"))
        .collect();
    lines[lines.len().saturating_sub(4)..].join("\n")
}

/// Start the server for a site folder and wait until it answers.
fn start_server(app: &AppHandle, path: &Path) -> Result<Running, String> {
    fs::create_dir_all(path).map_err(|e| format!("Can't create {}: {e}", path.display()))?;
    let port = port_for(path);
    let log = log_file(app);
    if let Some(dir) = log.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let out = File::create(&log).map_err(|e| e.to_string())?;
    let err = out.try_clone().map_err(|e| e.to_string())?;

    let mut cmd = Command::new(server_bin()?);
    cmd.arg("--data")
        .arg(path)
        .arg("--port")
        .arg(port.to_string())
        .arg("--host")
        .arg("127.0.0.1")
        .current_dir(path)
        .env("PREPRESS_PARENT_PID", std::process::id().to_string())
        // Desktop runtime: AI clients connect over stdio (`prepress mcp`), HTTP /mcp stays off.
        .env("PREPRESS_APP", "desktop")
        // The editor's Prepress logo leads back to the site list.
        .env("PREPRESS_LAUNCHER_URL", launcher_url("sites").to_string())
        .stdin(Stdio::null())
        .stdout(out)
        .stderr(err);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let mut child = cmd.spawn().map_err(|e| format!("Can't start the Prepress server: {e}"))?;

    let deadline = Instant::now() + Duration::from_secs(30);
    loop {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(format!("The Prepress server stopped ({status}).\n{}", log_tail(&log)));
        }
        if healthy(port) {
            break;
        }
        if Instant::now() > deadline {
            let _ = child.kill();
            return Err(format!("The Prepress server did not start in time.\n{}", log_tail(&log)));
        }
        sleep(Duration::from_millis(120));
    }
    Ok(Running { child, path: path.to_path_buf(), port })
}

fn stop_server(state: &AppState) {
    if let Some(mut r) = state.running.lock().unwrap().take() {
        let _ = r.child.kill();
        let _ = r.child.wait();
    }
}

/// The bundled launcher page.
fn launcher_url(hash: &str) -> Url {
    let base = if cfg!(windows) { "http://tauri.localhost/index.html" } else { "tauri://localhost/index.html" };
    Url::parse(&format!("{base}#{hash}")).expect("launcher url")
}

fn show_launcher(app: &AppHandle, hash: &str) {
    if let Some(w) = app.get_webview_window(MAIN) {
        let _ = w.set_title("Prepress");
        let _ = w.navigate(launcher_url(hash));
    }
}

fn current_site(app: &AppHandle) -> Option<(PathBuf, u16)> {
    let state = app.state::<AppState>();
    let guard = state.running.lock().unwrap();
    guard.as_ref().map(|r| (r.path.clone(), r.port))
}

// ---------- commands (launcher page only; the editor page has no IPC) ----------

/// Every site: the ones opened before (most recent first), then any other site folder in the
/// sites folder (Documents/Prepress), newest edit first.
#[tauri::command]
fn list_sites(app: AppHandle, state: State<'_, AppState>) -> Vec<SiteView> {
    let running = state.running.lock().unwrap().as_ref().map(|r| r.path.display().to_string());
    let mut entries = load_config(&app).sites;
    let mut found: Vec<SiteEntry> = fs::read_dir(sites_folder(app.clone()))
        .map(|dir| {
            dir.filter_map(Result::ok)
                .map(|e| e.path())
                .filter(|p| p.join("draft.json").is_file())
                .map(|p| SiteEntry { path: p.display().to_string(), name: String::new(), opened: 0 })
                .filter(|f| !entries.iter().any(|s| s.path == f.path))
                .collect()
        })
        .unwrap_or_default();
    found.sort_by_key(|f| std::cmp::Reverse(site_details(Path::new(&f.path)).2));
    entries.extend(found);
    entries
        .into_iter()
        .map(|s| {
            let p = PathBuf::from(&s.path);
            let exists = p.is_dir();
            let (pages, address, edited) = if exists { site_details(&p) } else { (0, None, 0) };
            SiteView {
                name: if exists { site_name(&p) } else { s.name },
                folder: folder_name(&p),
                running: running.as_deref() == Some(s.path.as_str()),
                path: s.path,
                opened: s.opened,
                edited,
                pages,
                address,
                exists,
            }
        })
        .collect()
}

#[tauri::command]
fn sites_folder(app: AppHandle) -> String {
    app.path()
        .document_dir()
        .unwrap_or_else(|_| std::env::temp_dir())
        .join("Prepress")
        .display()
        .to_string()
}

/// Make a new, empty site folder under Documents/Prepress. The editor sets the site up on first open.
#[tauri::command]
fn create_site(app: AppHandle, name: String) -> Result<String, String> {
    let clean = clean_folder_name(&name).map_err(|_| "Give the site a name.".to_string())?;
    let path = PathBuf::from(sites_folder(app)).join(&clean);
    if path.exists() && fs::read_dir(&path).map(|mut d| d.next().is_some()).unwrap_or(true) {
        return Err(format!("{} already exists. Open it, or pick another name.", path.display()));
    }
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path.display().to_string())
}

#[tauri::command]
async fn pick_folder(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .set_title("Open a Prepress site folder (or an empty folder for a new site)")
        .blocking_pick_folder()
        .and_then(|f| f.into_path().ok())
        .map(|p| p.display().to_string())
}

#[tauri::command]
async fn open_site(app: AppHandle, path: String) -> Result<(), String> {
    let path = PathBuf::from(path);
    let state = app.state::<AppState>();
    let window = app.get_webview_window(MAIN).ok_or("No window")?;

    // Already running for this folder: just go back to it.
    let same = {
        let mut guard = state.running.lock().unwrap();
        match guard.as_mut() {
            Some(r) if r.path == path => matches!(r.child.try_wait(), Ok(None)).then_some(r.port),
            _ => None,
        }
    };
    let port = match same {
        Some(port) => port,
        None => {
            stop_server(&state);
            let running = {
                let app = app.clone();
                let path = path.clone();
                tauri::async_runtime::spawn_blocking(move || start_server(&app, &path)).await.map_err(|e| e.to_string())??
            };
            let port = running.port;
            *state.running.lock().unwrap() = Some(running);
            port
        }
    };
    let url = format!("http://127.0.0.1:{port}/?admin=1");
    remember(&app, &path)?;
    let _ = window.set_title(&format!("{} — Prepress", site_name(&path)));
    window.navigate(Url::parse(&url).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}

#[tauri::command]
fn forget_site(app: AppHandle, path: String) -> Result<(), String> {
    let mut config = load_config(&app);
    config.sites.retain(|s| s.path != path);
    save_config(&app, &config)
}

#[tauri::command]
fn reveal(app: AppHandle, path: String) -> Result<(), String> {
    app.opener().reveal_item_in_dir(path).map_err(|e| e.to_string())
}

/// A site's public address, in the browser (http/https only).
#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err("Not a web address".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// Run the bundled server's `prepress site` command on a site folder (server/main.ts): the same
/// draft lock and header/footer rebuild as the editor, so an open editor picks the change up.
fn site_command(path: &Path, args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new(server_bin()?);
    cmd.arg("site").arg("--data").arg(path).args(args).stdin(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }
    let out = cmd.output().map_err(|e| format!("Can't run the Prepress server: {e}"))?;
    if !out.status.success() {
        let err = String::from_utf8_lossy(&out.stderr).trim().lines().last().unwrap_or("").to_string();
        return Err(if err.contains("no site yet") { "Open this site once before renaming it.".into() } else if err.is_empty() { "Renaming failed.".into() } else { err });
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

/// Change a site's title (what the header shows and the list calls it).
#[tauri::command]
async fn rename_site(app: AppHandle, path: String, name: String) -> Result<String, String> {
    let dir = PathBuf::from(&path);
    let out = tauri::async_runtime::spawn_blocking(move || site_command(&dir, &["--name", &name])).await.map_err(|e| e.to_string())??;
    let name = serde_json::from_str::<serde_json::Value>(&out).ok().and_then(|v| v["name"].as_str().map(str::to_string)).unwrap_or_default();
    let mut config = load_config(&app);
    for s in config.sites.iter_mut().filter(|s| s.path == path) {
        s.name = name.clone();
    }
    save_config(&app, &config)?;
    Ok(name)
}

/// Rename a site's folder in place. Its server is stopped first if it is running.
#[tauri::command]
fn rename_folder(app: AppHandle, state: State<'_, AppState>, path: String, folder: String) -> Result<String, String> {
    let src = PathBuf::from(&path);
    let clean = clean_folder_name(&folder)?;
    let parent = src.parent().ok_or("This folder can't be renamed")?;
    let dst = parent.join(&clean);
    if dst == src {
        return Ok(path);
    }
    // A different folder by that name (on case-insensitive disks, "site" → "Site" is the same one).
    let same = fs::canonicalize(&dst).ok().zip(fs::canonicalize(&src).ok()).map(|(a, b)| a == b).unwrap_or(false);
    if dst.exists() && !same {
        return Err(format!("{} already exists.", dst.display()));
    }
    if state.running.lock().unwrap().as_ref().map(|r| r.path == src).unwrap_or(false) {
        stop_server(&state);
    }
    fs::rename(&src, &dst).map_err(|e| format!("Can't rename the folder: {e}"))?;
    let new_path = dst.display().to_string();
    let mut config = load_config(&app);
    for s in config.sites.iter_mut().filter(|s| s.path == path) {
        s.path = new_path.clone();
    }
    save_config(&app, &config)?;
    Ok(new_path)
}

/// Copy a site into "<folder> copy" next to it: the draft and its media only. Never the publish
/// targets, their passwords, tokens or publish state, so the copy can't overwrite the original's live site.
#[tauri::command]
async fn duplicate_site(app: AppHandle, path: String) -> Result<String, String> {
    let src = PathBuf::from(&path);
    if !src.join("draft.json").is_file() {
        return Err("Only a site that has been opened once can be duplicated.".into());
    }
    let parent = src.parent().ok_or("No parent folder")?.to_path_buf();
    let base = format!("{} copy", folder_name(&src));
    let dst = (1..100)
        .map(|n| parent.join(if n == 1 { base.clone() } else { format!("{base} {n}") }))
        .find(|p| !p.exists())
        .ok_or("Too many copies")?;
    fs::create_dir_all(dst.join("uploads")).map_err(|e| e.to_string())?;
    let copy = |name: &str| -> Result<(), String> {
        let from = src.join(name);
        if from.is_file() {
            fs::copy(&from, dst.join(name)).map_err(|e| format!("Can't copy {name}: {e}"))?;
        }
        Ok(())
    };
    copy("draft.json")?;
    copy("media-imports.json")?;
    if let Ok(files) = fs::read_dir(src.join("uploads")) {
        for f in files.filter_map(Result::ok).filter(|f| f.file_type().map(|t| t.is_file()).unwrap_or(false)) {
            fs::copy(f.path(), dst.join("uploads").join(f.file_name())).map_err(|e| e.to_string())?;
        }
    }
    let name = format!("{} copy", site_name(&src));
    let target = dst.clone();
    // A title that says it's the copy; the folder copy is already usable if this fails.
    let _ = tauri::async_runtime::spawn_blocking(move || site_command(&target, &["--name", &name])).await;
    let mut config = load_config(&app);
    let at = config.sites.iter().position(|s| s.path == path).map(|i| i + 1).unwrap_or(0);
    config.sites.insert(at, SiteEntry { path: dst.display().to_string(), name: site_name(&dst), opened: 0 });
    config.sites.truncate(30);
    save_config(&app, &config)?;
    Ok(dst.display().to_string())
}

/// Move a site's folder to the Trash / Recycle Bin (asks first; restorable from there).
#[tauri::command]
async fn trash_site(app: AppHandle, path: String) -> Result<bool, String> {
    let dir = PathBuf::from(&path);
    if !dir.is_dir() {
        return Err("The folder is gone already.".into());
    }
    let bin = if cfg!(windows) { "Recycle Bin" } else { "Trash" };
    let text = format!(
        "The folder {} and everything in it go to the {bin}; you can restore it from there.\n\nCopies already published on the web stay online.",
        dir.display()
    );
    let yes = ask(&app, MessageDialogKind::Warning, format!("Move “{}” to the {bin}?", site_name(&dir)), text, MessageDialogButtons::OkCancelCustom(format!("Move to {bin}"), "Cancel".into())).await;
    if !yes {
        return Ok(false);
    }
    let state = app.state::<AppState>();
    if state.running.lock().unwrap().as_ref().map(|r| r.path == dir).unwrap_or(false) {
        stop_server(&state);
    }
    trash::delete(&dir).map_err(|e| format!("Can't move it to the {bin}: {e}"))?;
    let mut config = load_config(&app);
    config.sites.retain(|s| s.path != path);
    save_config(&app, &config)?;
    Ok(true)
}

// ---------- updates ----------

/// A message box, off the async runtime (the dialog blocks until answered). True for the first button.
async fn ask(app: &AppHandle, kind: MessageDialogKind, title: String, text: String, buttons: MessageDialogButtons) -> bool {
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || app.dialog().message(text).title(title).kind(kind).buttons(buttons).blocking_show())
        .await
        .unwrap_or(false)
}

/// Check for a newer version; offer to install it and restart. `manual` (the menu item) also
/// reports "up to date" and errors; automatic checks stay silent unless there is an update.
fn check_for_update(app: &AppHandle, manual: bool) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let state = app.state::<AppState>();
        if state.updating.swap(true, Ordering::SeqCst) {
            return;
        }
        let result = update(&app, manual).await;
        state.updating.store(false, Ordering::SeqCst);
        if let Err(e) = result {
            eprintln!("update: {e}");
            if manual {
                ask(&app, MessageDialogKind::Error, "Couldn’t update Prepress".into(), e, MessageDialogButtons::Ok).await;
            }
        }
    });
}

async fn update(app: &AppHandle, manual: bool) -> Result<(), String> {
    let found = app.updater().map_err(|e| e.to_string())?.check().await.map_err(|e| e.to_string())?;
    let Some(update) = found else {
        if manual {
            let text = format!("Prepress {} is the newest version.", env!("CARGO_PKG_VERSION"));
            ask(app, MessageDialogKind::Info, "You’re up to date".into(), text, MessageDialogButtons::Ok).await;
        }
        return Ok(());
    };
    let state = app.state::<AppState>();
    if !manual && state.declined.lock().unwrap().as_deref() == Some(update.version.as_str()) {
        return Ok(());
    }
    let notes = update.body.as_deref().map(str::trim).filter(|n| !n.is_empty()).map(|n| format!("{n}\n\n")).unwrap_or_default();
    let text = format!(
        "Prepress {} is available (you have {}).\n\n{notes}Prepress restarts to finish. Your sites are saved as you edit.",
        update.version, update.current_version
    );
    let yes = ask(
        app,
        MessageDialogKind::Info,
        "Update Prepress".into(),
        text,
        MessageDialogButtons::OkCancelCustom("Install and Restart".into(), "Later".into()),
    )
    .await;
    if !yes {
        *state.declined.lock().unwrap() = Some(update.version.clone());
        return Ok(());
    }

    // Progress in the window title; the editor stays usable while it downloads.
    let window = app.get_webview_window(MAIN);
    let title = window.as_ref().and_then(|w| w.title().ok()).unwrap_or_else(|| "Prepress".into());
    let (mut got, mut shown) = (0u64, u64::MAX);
    let version = update.version.clone();
    let downloaded = update
        .download(
            |chunk, total| {
                got += chunk as u64;
                let pct = total.filter(|t| *t > 0).map(|t| got * 100 / t).unwrap_or(0);
                if pct != shown {
                    shown = pct;
                    if let Some(w) = &window {
                        let _ = w.set_title(&format!("Downloading Prepress {version}… {pct}%"));
                    }
                }
            },
            || {},
        )
        .await;
    let bytes = match downloaded {
        Ok(b) => b,
        Err(e) => {
            if let Some(w) = &window {
                let _ = w.set_title(&title);
            }
            return Err(e.to_string());
        }
    };
    // Stop the server before installing: on Windows install() runs the installer and exits this
    // process right away, and a running prepress.exe would lock the file the installer replaces.
    stop_server(&state);
    if let Err(e) = update.install(bytes) {
        // The site's server is already stopped: back to the site list, from where it reopens.
        show_launcher(app, "sites");
        return Err(e.to_string());
    }
    app.restart();
}

// ---------- window, menu ----------

fn menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let about = AboutMetadata {
        name: Some("Prepress".into()),
        version: Some(env!("CARGO_PKG_VERSION").into()),
        comments: Some("Build websites with the WordPress block editor. Publish them anywhere.".into()),
        ..Default::default()
    };
    let app_menu = Submenu::with_items(
        app,
        "Prepress",
        true,
        &[
            &PredefinedMenuItem::about(app, Some("About Prepress"), Some(about))?,
            &MenuItem::with_id(app, "update", "Check for Updates…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "sites", "Sites…", true, Some("CmdOrCtrl+Shift+O"))?,
            &MenuItem::with_id(app, "new", "New Site…", true, Some("CmdOrCtrl+Shift+N"))?,
            &MenuItem::with_id(app, "open", "Open Site Folder…", true, Some("CmdOrCtrl+O"))?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "reveal", "Show Site Folder", true, None::<&str>)?,
            &MenuItem::with_id(app, "preview", "Open Preview in Browser", true, Some("CmdOrCtrl+Shift+P"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;
    // No Undo/Redo items: the block editor handles Cmd+Z itself, a menu item would take the key.
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[&MenuItem::with_id(app, "reload", "Reload", true, Some("CmdOrCtrl+R"))?, &PredefinedMenuItem::fullscreen(app, None)?],
    )?;
    let window = Submenu::with_items(
        app,
        "Window",
        true,
        &[&PredefinedMenuItem::minimize(app, None)?, &PredefinedMenuItem::maximize(app, None)?],
    )?;
    if cfg!(target_os = "macos") {
        Menu::with_items(app, &[&app_menu, &file, &edit, &view, &window])
    } else {
        // No app menu outside macOS: the update item goes under Help.
        let help = Submenu::with_items(app, "Help", true, &[&MenuItem::with_id(app, "update", "Check for Updates…", true, None::<&str>)?])?;
        Menu::with_items(app, &[&file, &edit, &view, &window, &help])
    }
}

fn on_menu(app: &AppHandle, id: &str) {
    match id {
        "sites" => show_launcher(app, "sites"),
        "new" => show_launcher(app, "new"),
        "open" => show_launcher(app, "open"),
        "reveal" => {
            if let Some((path, _)) = current_site(app) {
                let _ = app.opener().reveal_item_in_dir(path.join("draft.json"));
            }
        }
        "preview" => {
            if let Some((_, port)) = current_site(app) {
                let _ = app.opener().open_url(format!("http://127.0.0.1:{port}/"), None::<&str>);
            }
        }
        "update" => check_for_update(app, true),
        "reload" => {
            if let Some(w) = app.get_webview_window(MAIN) {
                let _ = w.eval("location.reload()");
            }
        }
        _ => {}
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![list_sites, sites_folder, create_site, pick_folder, open_site, forget_site, reveal, open_url, rename_site, rename_folder, duplicate_site, trash_site])
        .menu(menu)
        .on_menu_event(|app, event| on_menu(app, event.id().as_ref()))
        .setup(|app| {
            let popup = app.handle().clone();
            let dl = app.handle().clone();
            WebviewWindowBuilder::new(app, MAIN, WebviewUrl::App("index.html".into()))
                .title("Prepress")
                .inner_size(1440.0, 900.0)
                .min_inner_size(960.0, 600.0)
                // Tauri's own file-drop handler claims every drag on the window, so WebKit never
                // sees it and the editor's HTML5 drag & drop (moving blocks, List View, inserter,
                // dropping image files to upload) silently does nothing. Let the page handle drags.
                .disable_drag_drop_handler()
                // No on_navigation guard: wry calls it for iframes too (editor embeds, library
                // previews) without saying which frame, so a guard would break them. Remote pages
                // get no IPC anyway (capabilities cover the local launcher only).
                // "View site", "Open ↗" and other target=_blank links: the system browser.
                .on_new_window(move |url, _| {
                    let _ = popup.opener().open_url(url.as_str(), None::<&str>);
                    NewWindowResponse::Deny
                })
                // Exports land in Downloads; show the file when done.
                .on_download(move |_, event| {
                    let state = dl.state::<AppState>();
                    match event {
                        DownloadEvent::Requested { destination, .. } => {
                            *state.download.lock().unwrap() = Some(destination.clone());
                        }
                        DownloadEvent::Finished { path, success, .. } => {
                            let saved = path.or_else(|| state.download.lock().unwrap().take());
                            if let (true, Some(file)) = (success, saved) {
                                let _ = dl.opener().reveal_item_in_dir(file);
                            }
                        }
                        _ => {}
                    }
                    true
                })
                .build()?;
            // Release builds look for updates shortly after start, then every 6 hours.
            if !cfg!(debug_assertions) {
                let app = app.handle().clone();
                std::thread::spawn(move || {
                    sleep(Duration::from_secs(8));
                    loop {
                        check_for_update(&app, false);
                        sleep(Duration::from_secs(6 * 3600));
                    }
                });
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building Prepress")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                stop_server(&app.state::<AppState>());
            }
        });
}
