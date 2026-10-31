# JustTrakt

Your Trakt history, right on JustWatch. An independent Chrome extension with:

- Watched badges and optional poster dimming.
- Show completion percentages, episode counts and new-episode indicators.
- Partially watched movie progress.
- Trakt logo + community rating as a percentage (7.2/10 becomes 72%).
- Add to Trakt watchlist on hover cards and movie/show detail pages, with existing membership detection.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. It is not affiliated with JustWatch.

[Download the latest beta](https://github.com/conguero23/JustTrakt/releases/tag/v1.6.2) · [Report a bug](https://github.com/conguero23/JustTrakt/issues) · [Privacy policy](PRIVACY.md)

## Install from a GitHub release

1. Download **justtrakt-1.6.2.zip** from the repository's Releases page.
2. Extract it to a permanent folder. Keep that folder; Chrome loads the files from there.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the extracted folder containing `manifest.json`.
4. In [Trakt Developers](https://developer.trakt.tv/), create a **Development** app with redirect URI **http://localhost**. Trakt may require your verified GitHub account. The form currently limits development apps to localhost callbacks and production registration requires contacting Trakt.
5. Open JustTrakt, leave **Personal / development app (code)** selected, and paste only the app's public Client ID.
6. Click **Connect Trakt**. Enter the displayed code at **https://auth.trakt.tv/activate** and approve access using the app owner's Trakt account (or an invited user). The popup can be closed; polling continues in the background until expiry.
7. Reopen the popup to check sync status, then refresh JustWatch.

No localhost server is required: the device-code flow never redirects there. Never paste a Client Secret or Trakt password into JustTrakt. New development apps restrict sign-in to the owner and invited users; this extension does not bypass those restrictions.

Requires Chrome 120+ and a Trakt account. Node.js/npm are only for development. This GitHub build uses each user's personal public Client ID; it has no shared publisher credential or backend.

**Approved production app?** Select the PKCE option instead and register the exact HTTPS callback shown by the popup. For the unmodified release it is `https://ieecfkanimfjbenfohcekdefbbdnpibk.chromiumapp.org/trakt`. This callback cannot be registered on the development form shown above. Contact Trakt through its developer portal/support if you need production registration for a shared public app. The manifest public key keeps the extension ID stable and is not a secret.

## Settings and behavior

Set movie playback thresholds, dim watched posters, and show/hide in-progress badges in the popup. Dimming keeps the watched marker visible. Shows count unique regular-season episodes; specials are excluded. New-episode labels require a previously observed completed state.

Sync checks run approximately every 30 minutes; unchanged activity normally needs one request. Metadata gets a daily refresh to detect newly aired episodes even without account activity. **Sync now** forces a refresh and invalidates watchlist membership. A failed history sync retains the previous cache. All watched/playback/watchlist pages are paginated.

Ratings load on demand and cache for 24 hours (up to 1,500 titles). Watchlist snapshots cache for five minutes. The extension checks membership before offering Add. Saved items offer removal when clicked, with the action described in the button tooltip and accessible label. Only clicks write to Trakt. Trakt account limits and network errors appear next to the control. Provider offer links keep their normal behavior.

## New in 1.6.2: Movie-only last-seen dates

Last-seen dates appear only for movies. Show badges retain watched status and episode progress.

## Added in 1.6.1: Compact watch counts

Movie cards and detail pages show **Last seen (2)** with the watch count beside the label, saving a separate row.

## Added in 1.6.0: Watchlist on Trakt

Movie cards and detail pages now have a **Watchlist +** button beside JustWatch.
The extension checks membership first and displays **Saved** for items already
in the connected account's watchlist. Click Saved to remove. Checking, adding and
removing have visible spinners and disable duplicate clicks; failures show Retry
and an inline error. These controls use the extension-connected account, not the
website's session. They share a five-minute watchlist cache rather than fetching
metadata separately for every card. Exact movie slugs/IDs are used for writes.

## UI update in 1.5.2

Card tools and filters now match Trakt with charcoal surfaces, white text and orange accents. Last seen is a prominent localized date. A single full-width JustWatch action replaces the prior two-button row. Note buttons are removed from all Trakt cards/detail panels; previously saved notes are left untouched and still clear on Disconnect/uninstall.

## Layout update in 1.5.1

On Trakt summary cards, dates, watch counts and actions are placed in the right-hand details column beneath the title. Posters stay clear, and native metadata/rating positions remain visible. Compact JustWatch and Note buttons retain accessible labels.

## Added in 1.5.0: Trakt movie tools

- A **JustTrakt movie filters** bar on pages with movie cards: unwatched only (hide watched), last-seen-before date, and minimum/maximum watch count. **Show all / Reset** restores all loaded cards. Filters persist locally, affect loaded cards only, and leave detail pages accessible. Unknown history stays visible until you connect and sync.
- Compact watch counts beside Last seen, such as **Last seen (2)**, and a rewatch reminder only when the last watch is strictly more than **three calendar years** ago. Unknown dates and unwatched movies do not receive reminders. Toggle counts and reminders independently under On Trakt in the popup.
- **Find on JustWatch** actions on movie cards and detail pages. They open a title search in the chosen country, not a guaranteed exact match or a verified provider listing. Set the two-letter country code (such as us, gb or bo) in the popup.
- **Private note** opens an extension-owned editor, keeping note text out of Trakt's webpage. Save/delete locally with a 4,000-character limit per movie, up to 1,000 movies, subject to Chrome storage quota. Notes are never sent to a service. Notes have no server backup and Disconnect/uninstall clears them. Concurrent changes from another editor are detected before overwrite.

## Added in 1.4.0: On Trakt

The extension now adds **Last seen YYYY-MM-DD** to movie covers and the movie information page on `app.trakt.tv` and `trakt.tv`. It uses exact movie slugs/IDs and the watch history already synced in the extension; no extra API calls or website session access are needed. Unknown/unwatched movies receive no date. This shows the extension's connected account, identified in the tooltip, even if the website is signed in as someone else. Disable the feature with **On Trakt - Movie last-seen dates** in the popup.

Watchlist checking, adding and removing now show a spinner with an accessible busy state. The button stays disabled during the request, and errors clear the spinner for retry. Reduced-motion preferences are respected.

Trakt's live automated browser view returned a 403 response. Card/detail selectors were checked against Trakt's public frontend source (CardCover, SummaryPoster and MediaSummary); DOM fixture tests cover restoration, navigation and disconnect. A normal-session visual check is still needed.

## Added in 1.3.0

- **Hide watched titles in grids** removes fully watched cards locally. The floating **Show all** button reverses it, and detail pages remain visible. This filters loaded cards; it does not change JustWatch's search totals.
- Click an **In Trakt watchlist** button to remove the item; the tooltip and accessible label describe removal. New items still offer Add. History stays read-only.
- Click a Trakt percentage rating to open the exact title on Trakt.
- Show detail pages display the next regular-season episode and remaining aired count. Progress loads only on detail pages, caches for 15 minutes, and refreshes after a full history sync.
- Only movies show a last-watched date on posters and detail pages. Shows keep episode progress and watched status without a last-seen date. Unknown, invalid and future dates stay hidden.
- **Explain missing poster badges** adds a question-mark tooltip. Expand **Trakt matching details** on a title page for verified matching/history information; uncertain matches are never described as watched.
- **Check GitHub for updates** checks public releases at most daily while the popup is open. An update banner links to the download page. A manual check and off switch are available; no account data is sent and nothing installs automatically. Beta releases are included.

## Matching and limitations

Matching prefers IMDb/type-qualified TMDB IDs, then an exact, unambiguous title/year/type combination. An unmatched external ID does not fall back to a guessed title. Uncertain titles have no badge.

JustWatch's embedded Nuxt data and normal GraphQL responses can expose `content.externalIds.imdbId`. For example, [Time (2021)](https://www.justwatch.com/us/tv-show/time-2021) exposed `tt13138834` when inspected on October 31, 2026. The extension reads this data locally and does not make extra JustWatch API calls. Website markup and data formats can change. Automated tests do not establish the PRD's 95% matching or 0.5-second display targets.

Automatic browser inspection was blocked by JustWatch. Unit and DOM tests use fixtures/mocked Trakt data; final sign-in, token refresh, and live watchlist behavior require a real-account smoke test before calling a release stable.

## Privacy, security and permissions

No developer backend, analytics or telemetry. Account data and OAuth tokens are kept in local browser extension storage, not Chrome Sync. Trakt receives the requests needed for authentication, matching, ratings, history and clicked watchlist adds. Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

Permissions: `storage` caches data/settings, `alarms` schedules sync, `identity` handles the optional production PKCE login callback. Host access is limited to Trakt API/authentication, Trakt website pages for last-seen annotations, JustWatch, and the public GitHub release-list endpoint. No remotely hosted JavaScript runs in the extension.

**Disconnect** clears local account data, caches and all saved private notes, retaining display/filter preferences. It does not delete your Trakt data or revoke the app on Trakt. You can revoke access in Trakt's connected-app settings. Uninstall clears remaining extension settings.

## Updates and troubleshooting

Updates are manual: extract the new release over the files in your permanent folder, click **Reload** in `chrome://extensions`, then refresh JustWatch. Version 1.2.0 replaced legacy device login and introduced the stable manifest key; upgrading from earlier versions may require reconnecting. Version 1.3.0 keeps the 1.2.0 extension ID and login.

If login fails, use the default device-code mode for Development apps, register http://localhost, and check that you approve using the owner/invited Trakt account. Production PKCE requires an approved production app and its exact callback URL. If you cancelled sign-in, reopen the popup and retry. If watchlist adds fail, read the inline error; HTTP 420 means an account limit was reached. Never share tokens or full storage dumps when reporting a bug.

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
