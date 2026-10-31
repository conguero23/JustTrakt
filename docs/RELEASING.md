# Publish on GitHub

## What you need

- A GitHub account and a repository named `JustTrakt` (public if you want public downloads).
- Git on your computer, or GitHub Desktop, to upload the source.
- A connected/verified GitHub account in the Trakt developer portal if registering a Trakt app.
- A Trakt account for the final live sign-in/sync/watchlist checks.
- A decision about JustWatch's terms: this code preparation does not grant permission from JustWatch. Its terms restrict automated extraction and modification. Resolve that question before making a public release; see README.

This build uses personal public Client IDs. Each installer creates their own Development app with http://localhost and uses the default device-code mode. Production apps require Trakt approval; only those apps should use the optional HTTPS PKCE callback. There is no shared Client Secret, publisher backend, or paid hosting requirement. A shared publisher Client ID could simplify onboarding later, but is not configured here.

## Validate locally

```powershell
npm ci
npm run check
npm test
npm run package
```

Load the generated installable ZIP after extracting it to a permanent folder. Test this exact packaged build, not just the source folder. Authentication changed to PKCE in 1.2.0; disconnect/reconnect if upgrading from an earlier device-code build. The stable public key introduced in 1.2.0 is unchanged in 1.5.0. Do not delete an old install until you are comfortable with the new install. Account data remains on Trakt.

Before publishing, manually confirm:

- Trakt movie filters (unwatched/date/count) apply only to loaded cards and Reset restores them. Reminders appear only beyond three calendar years.
- Find on JustWatch uses the configured country and correct movie title. Private notes save/delete in an extension-owned tab and clear on Disconnect.

- On Trakt movie grids and detail pages, Last seen dates match the connected account. The On Trakt toggle and Disconnect clear them.
- Watchlist add/remove controls show a spinner until the request finishes, then show success or a retryable error.

- Default device-code login succeeds for a Development app registered with http://localhost. Code approval, expiry, denial and cancellation behave correctly. If testing an approved production app, verify its optional PKCE callback separately.
- Closing/declining the login window produces an understandable error and allows retry.
- Movie and show badges, progress and dimming work across browse/search/scroll/detail pages.
- An item already in your Trakt watchlist never offers Add; a new Add appears in your actual Trakt account.
- Ratings display the Trakt icon and percentage; missing data shows a dash.
- Disconnect removes local account data. Reconnect works. Offline sync preserves cached badges.
- Account token refresh works after expiration (do not publish tokens or storage dumps).

Use GitHub's **pre-release** checkbox until live authentication and all checks above pass. Automated tests use mocked Trakt responses, not a real account.

## Upload the source

Create an empty GitHub repository without an auto-generated README/license. From this project folder, run (replace YOUR-USERNAME):

```powershell
git init
git add .
git commit -m "Prepare JustTrakt 1.5.0 release"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/JustTrakt.git
git push -u origin main
```

Sign in to GitHub when prompted. `.gitignore` excludes node_modules, generated ZIPs, browser diagnostics and local secrets. GitHub Actions runs tests and creates downloadable artifacts automatically after pushing. The upload does not publish a GitHub Release by itself.

No Git? Extract `dist/justtrakt-1.5.0-source.zip`, then upload its contents through **Add file → Upload files**. Ensure the `.github` directory is included if you want CI.

## Create the downloadable release

1. In your repository, choose **Releases → Draft a new release**.
2. Create tag `v1.5.0`, target `main`, title `JustTrakt 1.5.0`.
3. Paste RELEASE_NOTES.md into the description.
4. Attach `dist/justtrakt-1.5.0.zip` and `dist/SHA256SUMS.txt`. Optionally also attach the source ZIP (its hash is included).
5. Mark it as a pre-release until live checks pass. Review the description, files and legal/branding notes, then publish when ready.
6. In repository settings, enable **Issues** and **Security → Private vulnerability reporting**. Use the Privacy and Security documents as the support policy; avoid asking users for storage exports.

Users need only the installable ZIP, a supported Chrome version, and their own Trakt Client ID. They do not need Node/npm or a GitHub account just to download a public release.

Official guide: https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

## Updating

Keep the manifest public key unchanged so the extension ID stays stable. Bump manifest/package versions together, update changelog and notes, validate, package, and create a new tag/release. Users replace files in their permanent install folder, click Reload in chrome://extensions, and refresh JustWatch. These unpacked builds do not auto-update.
