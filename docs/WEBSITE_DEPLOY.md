# Parola website and local FTP deployment

Domain: https://parola.shadowless-studios.eu

This website is a separate Vite build from the Android app. Its pages live in `site/`; output is `site-dist/`. Firebase web config comes from the existing untracked `.env.local` at the repository root. Do not publish `.env.local`, keystores, master passwords or FTP credentials.

1. Double-click `DEPLOY_SITE.cmd` to open the Windows menu. Choose **[1] FTP-Einstellungen oeffnen**, or run `DEPLOY_SITE.cmd setup` directly. The file `deploy.local.env` opens locally in Notepad.
2. Enter `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD` and `HOSTINGER_FTP_TARGET` from Hostinger's FTP Accounts and the Parola subdomain's document root. The blank `HOSTINGER_FTP_TARGET` value intentionally prevents writes to other domains. Do not guess the path.
3. Choose **[2] Vorschau** in the menu, or run `DEPLOY_SITE.cmd preview` to build and preview the 7 planned files. **Preview works even if credentials are still missing** and never connects to FTP.
4. Choose **[3] Verbindungstest**, or run `DEPLOY_SITE.cmd probe` to test FTPS login and navigate **read-only** to the configured Parola document root. No files are written.
5. After a successful probe, choose **[4] Hochladen** (with confirmation) or run `DEPLOY_SITE.cmd publish` to upload. No remote files are deleted.
6. Check `/`, `/privacy.html`, `/terms.html` and `/delete-account.html` through HTTPS.

The FTP host `ftp.shadowless-studios.eu:21` is reachable from the local PC (as checked 27 Oct 2026), and the Parola subdomain currently serves Hostinger's default page. The **FTP account and exact subdomain path must still be supplied in the local configuration**. Do not share a real FTP password in chat. Any `deploy.local.env` file remains gitignored.

The currently used Firebase project is `password-manager-parola`. Spark is active and Cloud Functions billing is **not enabled**. The direct account removal path requires a recent Firebase sign-in and is limited to accounts **without a server-side premium entitlement**. Accounts with a server entitlement require privileged Cloud Functions cleanup. If billing/Functions are later enabled, configure and test `VITE_DELETE_ACCOUNT_BACKEND=functions` in the local build config (do not deploy a nonfunctional endpoint).

**Release blockers**: Privacy text is a marked draft pending legal controller details, DPA and support contact. Do not use this site in a final Play Console submission until these details and actual account removal are verified. Google Play's deletion URL can be `https://parola.shadowless-studios.eu/delete-account.html` after release verification.

Only the website (`site-dist/`) is uploaded. Firebase Functions remain separate and are deployed with `firebase deploy --only functions:deleteOwnAccount` once billing and permissions are enabled and tests pass.

## Versioned incremental deployments

The website has a **single latest-release file**, `parola-deploy-manifest.json`,
generated locally in `site-dist/` and uploaded to the Parola web directory only
after every modified file was transferred and its SHA-256 hash rechecked.

- The manifest stores the npm app version, a content-based release ID, each
  relative file name, file size and SHA-256 hash.
- The `probe` command reads the remote manifest without writing and reports
  exactly which files would change. Choosing upload in the interactive menu
  performs this check **before** the confirmation prompt.
- After confirmation, files with matching hashes are **skipped**. Only new
  or changed website files are transferred. Static hashed asset files are
  uploaded before HTML; `index.html` is sent last among the pages.
- A release snapshot goes into the remote `deploy-history/` directory.
  The main version file is uploaded **last**. Old assets are not automatically
  deleted; to roll back pages, retrieve the previous site files from your own
  retained build/source history (the manifest itself is only metadata).
- On a first deployment without a remote manifest, all seven website files
  are uploaded once; subsequent runs are incremental.
- Never place credentials in the manifest or GitHub. Avoid manually modifying
  site files on the server, because the remote version file would then be stale.

## Certificate hostname error

If FTPS says `CERTIFICATE_VERIFY_FAILED: Hostname mismatch`, the
`ftp.shadowless-studios.eu` alias is not covered by the FTP server's
TLS certificate. A read-only diagnosis on 27 October 2026 identified a
certificate for `*.hstgr.io`. **Do not disable TLS certificate validation**
and do not switch to insecure FTP to bypass the warning.

In Hostinger hPanel, open **Websites > Dashboard > Plan Details** or
**Files > FTP Accounts** and copy the **actual server hostname** from that
hosting plan into `HOSTINGER_FTP_HOST` inside the local
`deploy.local.env` file. Do not invent a `*.hstgr.io` subdomain.
Then choose **[3] connection probe** before **[4] publish**. A correct
hostname and a certificate-valid connection are required before the
script sends the FTP password.


## Hostinger SFTP (recommended)

Parola supports **SFTP over SSH** as well as FTPS. In the local
`deploy.local.env`, select:

```ini
HOSTINGER_FTP_HOST=191.96.63.25
HOSTINGER_FTP_PORT=65002
HOSTINGER_FTP_PROTOCOL=sftp
HOSTINGER_FTP_USER=<SSH username from Hostinger SSH Access>
HOSTINGER_FTP_PASSWORD=<SSH/FTP password, local only>
HOSTINGER_FTP_TARGET=<confirmed Parola document root>
HOSTINGER_SFTP_HOSTKEY_SHA256=<verified SSH host key fingerprint>
```

The variables retain the `HOSTINGER_FTP_` prefix for compatibility; their
`sftp` setting selects **SSH**, not FTP. The first connection is refused
until `HOSTINGER_SFTP_HOSTKEY_SHA256` matches the remote SHA256 fingerprint.
Use the one shown in **Hostinger > SSH Access**. The probe prints the
received fingerprint *before password authentication*, for comparison.
Do not trust an unexpected fingerprint or save an unverified key.
SSH access must be enabled in Hostinger hPanel.

The main SSH account username is typically the account shown in SSH Access
(e.g. `u969889962`). A separately created FTP-only username such as
`u969889962.shadowlessgt` may not work for SFTP. Use the SSH Access
screen as the authority for the username.

The target `/parola/` is normalized to the relative directory
`parola` under the SSH/SFTP login home. **It is not proven to be the
document root for `parola.shadowless-studios.eu`.** Verify the subdomain
root in Hostinger's file manager before publishing.

The Windows deploy script installs `paramiko` once with pip when SFTP is
selected and the package is missing. FTPS and offline preview require
no additional Python dependencies.

Run `DEPLOY_SITE.cmd probe` for a **read-only connection** and version
comparison. After successful verification, `DEPLOY_SITE.cmd publish`
uploads only changed files, then updates the remote version manifest last.
