# Prepress and Exopanel

Prepress is the **interface for building a site**; Exopanel **hosts** it.

```
 Prepress (desktop app on the customer's computer,          Exopanel server
           later also prepress.digitalno.de)
   site folder: drafts, media, settings  ──Publish──▶  sftp/ftps  ──▶  /home/acme/htdocs/example.com
   (stays local until published)                                       (static files, nginx/Apache, TLS)
```

The customer builds the site in Prepress. Nothing leaves their computer until
they **Publish** (static HTML + media over SFTP/FTPS/S3) or **Export** (a zip for
WordPress). Exopanel needs no Prepress process, no PHP and no database for these sites.

## What Exopanel provides per site

1. A static vhost on a document root, e.g. `/home/acme/htdocs/example.com`, with TLS.
   Clean URLs and the 404 page:

   ```nginx
   root /home/acme/htdocs/example.com;
   index index.html;
   location / { try_files $uri $uri/ =404; }
   error_page 404 /404.html;
   ```

   Apache: `ErrorDocument 404 /404.html`. The site must be at the root of its (sub)domain.

2. Upload credentials, shown to the customer as **one connection string** they paste
   into Prepress (Site → Publish to → Add publish target):

   ```
   sftp://acme:<password>@server1.exopanel.example/home/acme/htdocs/example.com
   ```

   or, for FTP-only accounts, `ftps://acme:<password>@server1.exopanel.example/htdocs/example.com`.
   A "Copy Prepress connection" button next to the site's SFTP details is all the
   integration this needs. SSH keys work too (`sftp://acme@host/…` with the
   customer's key on the account).

3. Nothing else. Prepress uploads only changed files, never deletes files it didn't
   upload (`.htaccess`, `.well-known/`, `.user.ini` are safe), and backs up the
   panel's placeholder `index.html` on the customer's computer before replacing it.

## Recommended account setup

- An SFTP-only (chrooted) user per site, or per customer, with write access to the
  document root only.
- Show the server's SSH host key fingerprint in the panel: Prepress pins the key
  on the first upload and shows it in **Test** (`host key SHA256:…`), so customers
  can compare.
- Prefer SFTP or FTPS. Plain `ftp://` works but sends the password unencrypted
  (Prepress warns about it).

## Later: prepress.digitalno.de

The hosted editor will publish the same way (connection string → upload). Open
design points for that version, not built yet:

- Where a site's data lives between sessions (the browser, an account store, or
  the customer's own storage). Today it is a local folder.
- Uploading from a hosted service means Exopanel servers accept SFTP from it;
  upload straight from the browser is only possible to S3-style storage (CORS +
  signed requests), not SFTP/FTP.
- A deep link from Exopanel ("Edit with Prepress") that pre-fills the connection.
