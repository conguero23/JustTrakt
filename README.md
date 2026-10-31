# JustTrakt

Your Trakt history, right on JustWatch. An independent Chrome extension with:

- Watched badges and optional poster dimming.
- Show completion percentages, episode counts and new-episode indicators.
- Partially watched movie progress.
- Trakt logo + community rating as a percentage (7.2/10 becomes 72%).
- Add to Trakt watchlist on hover cards and movie/show detail pages, with existing membership detection.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. It is not affiliated with JustWatch.

## Install from a GitHub release

1. Download **justtrakt-1.2.0.zip** from the repository's Releases page.
2. Extract it to a permanent folder. Keep that folder; Chrome loads the files from there.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. Open JustTrakt using Chrome's Extensions menu. Copy the redirect URL shown in the popup.
5. Register a personal app at [Trakt Developers](https://developer.trakt.tv/), using that exact redirect URL. Trakt may require linking/verifying your GitHub account for developer registration.
6. Paste the app's **public Client ID** into the popup, click **Connect Trakt**, and approve in the Trakt sign-in window. Never paste a Client Secret or Trakt password into JustTrakt.
7. Reopen the popup to check sync status, then refresh JustWatch.

Requires Chrome 120+ and a Trakt account. Node.js/npm are only for development; installers need neither. This GitHub build uses each user's personal Client ID. It does not ship a shared publisher credential or require paid hosting.

The callback is `https://ieecfkanimfjbenfohcekdefbbdnpibk.chromiumapp.org/trakt` for the unmodified release. Trust the value shown by your installed popup if you change the manifest key. The `manifest.json` key is a **public key**, not a secret, and keeps unpacked IDs stable. Do not rotate it between releases.

## Settings and behavior

Set movie playback thresholds, dim watched posters, and show/hide in-progress badges in the popup. Dimming keeps the watched marker visible. Shows count unique regular-season episodes; specials are excluded. New-episode labels require a previously observed completed state.

Sync checks run approximately every 30 minutes; unchanged activity normally needs one request. Metadata gets a daily refresh to detect newly aired episodes even without account activity. **Sync now** forces a refresh and invalidates watchlist membership. A failed history sync retains the previous cache. All watched/playback/watchlist pages are paginated.

Ratings load on demand and cache for 24 hours (up to 1,500 titles). Watchlist snapshots cache for five minutes. The extension checks membership before offering Add, and only a click writes to Trakt. Trakt account limits and network errors appear next to the control. Provider offer links keep their normal behavior.

## Matching and limitations

Matching prefers IMDb/type-qualified TMDB IDs, then an exact, unambiguous title/year/type combination. An unmatched external ID does not fall back to a guessed title. Uncertain titles have no badge.

JustWatch's embedded Nuxt data and normal GraphQL responses can expose `content.externalIds.imdbId`. For example, [Time (2021)](https://www.justwatch.com/us/tv-show/time-2021) exposed `tt13138834` when inspected on October 31, 2026. The extension reads this data locally and does not make extra JustWatch API calls. Website markup and data formats can change. Automated tests do not establish the PRD's 95% matching or 0.5-second display targets.

Automatic browser inspection was blocked by JustWatch. Unit and DOM tests use fixtures/mocked Trakt data; final sign-in, token refresh, and live watchlist behavior require a real-account smoke test before calling a release stable.

## Privacy, security and permissions

No developer backend, analytics or telemetry. Account data and OAuth tokens are kept in local browser extension storage, not Chrome Sync. Trakt receives the requests needed for authentication, matching, ratings, history and clicked watchlist adds. Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

Permissions: `storage` caches data/settings, `alarms` schedules sync, `identity` handles the PKCE login callback. Host access is limited to Trakt's API/authentication domains and JustWatch pages. No remotely hosted JavaScript runs in the extension.

**Disconnect** clears local account data and caches, retaining display preferences. It does not delete your Trakt data or revoke the app on Trakt. You can revoke access in Trakt's connected-app settings. Uninstall clears remaining extension settings.

## Updates and troubleshooting

Updates are manual: extract the new release over the files in your permanent folder, click **Reload** in `chrome://extensions`, then refresh JustWatch. Version 1.2.0 replaces legacy device login and may require reconnecting; the stable manifest key may give older unpacked installs a different extension ID.

If login fails, check the Client ID and exact callback URL in Trakt settings. If you cancelled sign-in, reopen the popup and retry. If watchlist adds fail, read the inline error; HTTP 420 means an account limit was reached. Never share tokens or full storage dumps when reporting a bug.

## Development and releases

Use Node.js 24 LTS:

```sh
npm ci
npm run check
npm test
npm run package
```

The packager writes a clean installable ZIP, a source ZIP and `SHA256SUMS.txt` in `dist/`. It uses an explicit file list, excluding dependencies, browser diagnostics and local credentials. GitHub Actions runs the same checks. See [docs/RELEASING.md](docs/RELEASING.md) for repository upload, live smoke tests and release instructions.

## License and service terms

Original software is [MIT licensed](LICENSE). Trakt's icon and third-party marks are governed separately; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Publishing on GitHub does not grant permission from JustWatch. [JustWatch's terms](https://support.justwatch.com/article/just-watchs-terms-of-use) restrict modification and automated extraction. Resolve that terms question before public distribution. This project is not a legal clearance or a claim of approval by either service. Follow [Trakt's API use policy](https://developer.trakt.tv/docs/api-use-policy), branding rules and API restrictions.
