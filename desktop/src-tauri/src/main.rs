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
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs::{self, File},
    io::{Read, Write},
    net::{SocketAddr, TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::Mutex,
    thread::sleep,
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

use serde::{Deserialize, Serialize};
use tauri::{
    menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu},
    webview::{DownloadEvent, NewWindowResponse},
    AppHandle, Manager, RunEvent, State, Url, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

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
    opened: u64,
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
    let lines: Vec<&str> = text.lines().filter(|l| !l.trim().is_empty()).collect();
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

#[tauri::command]
fn list_sites(app: AppHandle, state: State<'_, AppState>) -> Vec<SiteView> {
    let running = state.running.lock().unwrap().as_ref().map(|r| r.path.display().to_string());
    load_config(&app)
        .sites
        .into_iter()
        .map(|s| {
            let p = PathBuf::from(&s.path);
            let exists = p.is_dir();
            SiteView {
                name: if exists { site_name(&p) } else { s.name },
                running: running.as_deref() == Some(s.path.as_str()),
                path: s.path,
                opened: s.opened,
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
    let clean: String = name
        .trim()
        .chars()
        .map(|c| if matches!(c, '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|') || c.is_control() { '-' } else { c })
        .collect();
    let clean = clean.trim_matches(|c: char| c == '.' || c.is_whitespace()).to_string();
    if clean.is_empty() {
        return Err("Give the site a name.".into());
    }
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
        Menu::with_items(app, &[&file, &edit, &view, &window])
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
        "reload" => {
            if let Some(w) = app.get_webview_window(MAIN) {
                let _ = w.eval("location.reload()");
            }
        }
        _ => {}
    }
}

/// Pages the window may show: the launcher and the local Prepress editor. Everything else opens in the browser.
fn internal(url: &Url) -> bool {
    match url.scheme() {
        "tauri" => true,
        "http" | "https" => matches!(url.host_str(), Some("127.0.0.1") | Some("tauri.localhost")),
        "about" | "blob" | "data" => true,
        _ => false,
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![list_sites, sites_folder, create_site, pick_folder, open_site, forget_site, reveal])
        .menu(menu)
        .on_menu_event(|app, event| on_menu(app, event.id().as_ref()))
        .setup(|app| {
            let nav = app.handle().clone();
            let popup = app.handle().clone();
            let dl = app.handle().clone();
            WebviewWindowBuilder::new(app, MAIN, WebviewUrl::App("index.html".into()))
                .title("Prepress")
                .inner_size(1440.0, 900.0)
                .min_inner_size(960.0, 600.0)
                .on_navigation(move |url| {
                    if internal(url) {
                        return true;
                    }
                    let _ = nav.opener().open_url(url.as_str(), None::<&str>);
                    false
                })
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
