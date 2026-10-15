# Publishing a Prepress site

Prepress runs on your computer (desktop app or the `prepress` binary). The site
lives in a local folder until you publish it. **Publish** renders plain static
files and uploads them to your host; nothing runs on the host but a web server.

```
<out>/index.html            front page
<out>/<slug>/index.html     other pages  (/menu/, /visit/ …)
<out>/404.html              not-found page
<out>/uploads/*             media
```

`<out>` is `<site folder>/public` unless `--out` says otherwise; the editor previews it at `/`.

## Publish targets

Click **Publish** in the editor. With no targets yet it asks where the site should
go; later targets are ticked in the same dialog and managed in **Settings** (gear) →
**Publishing**. Paste a
connection string (the template buttons fill one in), **Test**, **Save**. Each
target has a name, an optional public URL (for "Open" links) and *Upload
automatically on Publish* (off = only when you click **Upload now**).

| Host | Connection |
|---|---|
| SSH / VPS / most panels | `sftp://user:password@example.com/var/www/example.com` |
| SFTP with your SSH key or ssh-agent | `sftp://user@example.com/~/public_html` (no password) · `?key=~/.ssh/deploy_key` for a specific key |
| Shared hosting (FTP over TLS) | `ftps://user:password@ftp.example.com/public_html` |
| Plain FTP (unencrypted, avoid) | `ftp://user:password@ftp.example.com/public_html` |
| Amazon S3 | `s3://ACCESS_KEY:SECRET_KEY@my-bucket/site?region=eu-central-1` |
| Cloudflare R2, MinIO, DigitalOcean Spaces, Backblaze B2, Wasabi | `s3://KEY:SECRET@my-bucket?endpoint=https://<account>.r2.cloudflarestorage.com` |
| A folder on this computer | `/Users/me/Sites/www`, `~/www`, `file:///srv/www` |

Notes on the format:

- Passwords and secret keys may contain `@`, `/` or `:` as-is (the last `@` before the
  host ends them); percent-encoding (`%40`) works too.
- SFTP: `/path` is absolute, `/~/path` (or no path) is inside the login folder.
  FTP: paths are relative to the FTP login folder (`//path` for absolute).
- S3: custom endpoints use path-style URLs (`endpoint/bucket/key`); add `&path-style=0`
  for virtual-host style. The key needs `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`.
  Serving the bucket as a website (index document `index.html`, error document
  `404.html`, a CDN or custom domain) is set up at the provider.

Passwords and keys are stored only in the site folder (`deploy.json`, file mode
0600). The editor never receives them back: it shows `••••••`, and saving with
`••••••` keeps the stored secret. Changing the user, host or access key requires
entering the secret again. An AI over MCP can publish (`publish_site`,
`deploy_site`) but can't see or change targets.

## How an upload works

- Only files that changed since the last upload to that target are sent (content
  hashes in `<site folder>/deploys/<id>.json`): media first, pages next, the front page last.
- Only files Prepress uploaded to that target are ever deleted (a removed page).
  `.htaccess`, `.well-known/` and anything else already there is left alone.
- A file it would replace that it didn't upload (the host's placeholder `index.html`)
  is downloaded to `<site folder>/backup/<target>-<time>/` first.
- SFTP uploads go to a temporary name and are renamed into place, so visitors never
  see half a page. The server's host key is trusted on first connect and pinned for
  that target; a changed key fails the upload (edit and save the target to trust a new one).
- A failed target doesn't fail the Publish: the editor shows the error and the
  target's last status. **Upload now** retries without re-rendering.
- Editing where a target points forgets what was uploaded there (the next upload
  sends everything).

## Web server settings

Clean URLs (`/menu/` → `menu/index.html`) work by default in nginx, Apache and
most panels. Add the 404 page:

**nginx**
```nginx
root /var/www/example.com;
index index.html;
location / { try_files $uri $uri/ =404; }
error_page 404 /404.html;
```

**Apache** (`.htaccess`): `ErrorDocument 404 /404.html`

The site must be at the root of a domain or subdomain (links are root-relative,
like WordPress's).

## Security model

Prepress has no password. It listens on `127.0.0.1` only and answers only
requests whose `Host` is `localhost`, `127.0.0.1`, `[::1]` or `*.localhost`, so
other machines can't reach it and a web page can't reach it through DNS
rebinding; cross-origin writes are refused. To edit a site that lives on a
server, use an SSH tunnel (`ssh -L 8080:127.0.0.1:8080 you@server`) — or, better,
edit locally and publish to the server.

## Connecting an AI (MCP)

- **Same computer**: the AI client starts `prepress mcp --data <site folder>` itself
  and talks over stdio (no port, no token). The editor's Settings → AI connection shows the command
  and a Claude Desktop config. It can run while the editor has the folder open.
- **HTTP** at `/mcp` on the editor's port, with the bearer token from Settings → AI connection
  (`<site folder>/mcp-token.txt`); `--no-mcp` turns it off.
