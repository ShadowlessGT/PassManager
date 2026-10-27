# Parola website and local FTP deployment

Domain: https://parola.shadowless-studios.eu

This website is a separate Vite build from the Android app. Its pages live in `site/`; output is `site-dist/`. Firebase web config comes from the existing untracked `.env.local` at the repository root. Do not publish `.env.local`, keystores, master passwords or FTP credentials.

1. Run `DEPLOY_SITE.cmd setup`. The file `deploy.local.env` opens locally in Notepad.
2. Enter `HOSTINGER_FTP_USER`, `HOSTINGER_FTP_PASSWORD` and `HOSTINGER_FTP_TARGET` from Hostinger's FTP Accounts and the Parola subdomain's document root. The blank `HOSTINGER_FTP_TARGET` value intentionally prevents writes to other domains. Do not guess the path.
3. Run `DEPLOY_SITE.cmd` to build and preview the 7 planned files. **Preview works even if credentials are still missing** and never connects to FTP.
4. Run `DEPLOY_SITE.cmd probe` to test FTPS login and navigate **read-only** to the configured Parola document root. No files are written.
5. After a successful probe, run `DEPLOY_SITE.cmd publish` to upload. No remote files are deleted.
6. Check `/`, `/privacy.html`, `/terms.html` and `/delete-account.html` through HTTPS.

The FTP host `ftp.shadowless-studios.eu:21` is reachable from the local PC (as checked 27 Oct 2026), and the Parola subdomain currently serves Hostinger's default page. The **FTP account and exact subdomain path must still be supplied in the local configuration**. Do not share a real FTP password in chat. Any `deploy.local.env` file remains gitignored.

The currently used Firebase project is `password-manager-parola`. Spark is active and Cloud Functions billing is **not enabled**. The direct account removal path requires a recent Firebase sign-in and is limited to accounts **without a server-side premium entitlement**. Accounts with a server entitlement require privileged Cloud Functions cleanup. If billing/Functions are later enabled, configure and test `VITE_DELETE_ACCOUNT_BACKEND=functions` in the local build config (do not deploy a nonfunctional endpoint).

**Release blockers**: Privacy text is a marked draft pending legal controller details, DPA and support contact. Do not use this site in a final Play Console submission until these details and actual account removal are verified. Google Play's deletion URL can be `https://parola.shadowless-studios.eu/delete-account.html` after release verification.

Only the website (`site-dist/`) is uploaded. Firebase Functions remain separate and are deployed with `firebase deploy --only functions:deleteOwnAccount` once billing and permissions are enabled and tests pass.
