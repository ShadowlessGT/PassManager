# Parola website and local FTP deployment

Domain: https://parola.shadowless-studios.eu

This website is a separate Vite build from the Android app. Its pages live in `site/`; output is `site-dist/`. Firebase web config comes from the existing untracked `.env.local` at the repository root. Do not publish `.env.local`, keystores, master passwords or FTP credentials.

1. Copy `deploy.local.env.example` to `deploy.local.env`. Enter the **actual Hostinger FTP document root** for the subdomain and your credentials. Use **FTPS** instead of unencrypted FTP whenever supported. Never point at another site's root.
2. Run `DEPLOY_SITE.cmd` for a **dry run**: build and list planned uploads. This does not contact FTP.
3. Run `DEPLOY_SITE.cmd publish` to upload. It does not delete any files from the server.
4. Check the index, privacy, terms and delete-account pages over HTTPS on the public domain.

The currently used Firebase project is `password-manager-parola`. Spark is active and Cloud Functions billing is **not enabled**. The direct account removal path requires a recent Firebase sign-in and is limited to accounts **without a server-side premium entitlement**. Accounts with a server entitlement require privileged Cloud Functions cleanup. If billing/Functions are later enabled, configure and test `VITE_DELETE_ACCOUNT_BACKEND=functions` in the local build config (do not deploy a nonfunctional endpoint).

**Release blockers**: Privacy text is a marked draft pending legal controller details, DPA and support contact. Do not use this site in a final Play Console submission until these details and actual account removal are verified. Google Play's deletion URL can be `https://parola.shadowless-studios.eu/delete-account.html` after release verification.

Only the website (`site-dist/`) is uploaded. Firebase Functions remain separate and are deployed with `firebase deploy --only functions:deleteOwnAccount` once billing and permissions are enabled and tests pass.
