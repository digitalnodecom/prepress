# Deploying a Prepress site

**Publish** writes a plain static site (HTML + media) into a folder; any web
server serves it on ports 80/443. Two ways to run it:

- **Keep Prepress running** (editor on its own port, e.g. 8080) and add **deploy
  targets**: every Publish copies the site to another folder on the same machine
  and/or to remote servers over SFTP. See [Deploy targets](#deploy-targets).
- **Point `--out` at the web root** and stop Prepress when you're done editing.

```
<out>/index.html            front page
<out>/<slug>/index.html     other pages  (/menu/, /visit/ …)
<out>/404.html              not-found page
<out>/uploads/*             media
```

## Setup

1. In your hosting panel (cPanel, Plesk, CloudPanel, CyberPanel, aaPanel, …)
   create the site/domain as a **static site** and note its document root,
   e.g. `/home/example/htdocs/example.com`. The panel handles TLS (Let's Encrypt).
2. Either add that folder as a [deploy target](#deploy-targets) and keep Prepress
   running, or run Prepress on another port with that folder as the output:

   ```bash
   ./prepress --port 8080 --out /home/example/htdocs/example.com --site-url https://example.com
   ```

   Run it as a user that can write the document root. Keep `--data` **outside** the
   document root (Prepress refuses otherwise: it holds the admin password and drafts).
3. Open the editor, edit, click **Publish**. The site is live at your domain.
4. With `--out` at the web root you can stop Prepress when you're done editing;
   the site keeps working.

Publish only replaces or removes files it wrote itself (listed in
`<data>/published.json`). Files the panel put there (`.htaccess`, `.well-known/`, …)
are left alone; if a page would overwrite one (typically the panel's placeholder
`index.html`), the old file is copied to `<data>/backup/<time>/` first.

## Deploy targets

Editor → **Site** tab → **Deploy** → *Add deploy target*. Each target has a name,
an optional public URL (for "Open" links) and *Deploy automatically on Publish*
(off = only when you click **Deploy now**).

- **Local folder**: a directory on this machine, e.g. the panel's document root
  `/home/example/htdocs/example.com`. Prepress must be able to write it.
- **Remote (SFTP)**: `user`, `host` (or an `~/.ssh/config` alias), port, remote
  folder (absolute, or relative to the login folder such as `public_html`).
  Prepress runs the system `sftp` (OpenSSH) with **your SSH keys**: the agent,
  `~/.ssh/config`, default keys, or a key file you set. Passwords are not
  supported (no interactive prompts): run `ssh-copy-id user@host` once. New host
  keys are accepted on first connect (`StrictHostKeyChecking=accept-new`); a
  changed key fails the deploy. **Test** checks the login and creates the folder.

```
  editor :8080 ──Publish──▶ <out> (preview at :8080/) ──deploy──▶ /var/www/example.com
                                                         └────────▶ sftp deploy@web1:/srv/site
```

How a deploy works:

- Only files that changed since the last deploy to that target are uploaded
  (content hashes in `<data>/deploys/<id>.json`); media first, pages after,
  the front page last.
- Only files Prepress uploaded to that target are ever deleted (a removed page).
  `.htaccess`, `.well-known/` and anything else already there is left alone.
- A file it would replace that it didn't upload (the host's placeholder
  `index.html`) is backed up to `<data>/backup/<target>-<time>/` first.
- A failed target doesn't fail the Publish: the editor shows the error and the
  target's last status. **Deploy now** retries without re-rendering.
- Editing a target's destination forgets what was uploaded there (the next
  deploy uploads everything again).

Targets are stored in `<data>/deploy.json`; they hold no secrets. An AI on MCP
can deploy (`publish_site`, `deploy_site`) but can't add or change targets.

## Web server settings

Clean URLs (`/menu/` → `menu/index.html`) work by default in nginx, Apache and
most panels. Add the 404 page:

**nginx**
```nginx
root /home/example/htdocs/example.com;
index index.html;
location / { try_files $uri $uri/ =404; }
error_page 404 /404.html;
```

**Apache** (`.htaccess`): `ErrorDocument 404 /404.html`

The site must be at the root of a domain or subdomain (links are root-relative,
like WordPress's).

## Editing on a remote server

Prepress binds to `127.0.0.1` by default. The safe ways to reach the editor:

- **SSH tunnel** (nothing exposed): `ssh -L 8080:127.0.0.1:8080 you@server`,
  then open `http://localhost:8080/?admin=1`.
- **Panel reverse proxy with TLS**: create e.g. `edit.example.com` in the panel as a
  reverse proxy to `http://127.0.0.1:8080`. Keep the admin password set.

Don't expose `--host 0.0.0.0` over plain HTTP: the admin password would travel unencrypted.

## Connecting an AI (MCP)

Prepress exposes an MCP server at `/mcp` on the editor port. The token is in the editor
(**Site → AI connection**) and in `<data>/mcp-token.txt`; `--mcp-token` fixes it, `--no-mcp` turns it off.
Remote AI clients need the same safe path as the editor: an SSH tunnel or a TLS reverse
proxy (e.g. `edit.example.com/mcp`). The token can change and publish the site — treat it like a password.
