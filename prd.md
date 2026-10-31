# PRD: Trakt Watched Overlay for JustWatch

## 1. Summary
A Chrome extension (Manifest V3) that pulls your watch history from Trakt and overlays a status badge on every title cover on justwatch.com, so you can instantly see what you've watched, what you're partway through, and what's new.

## 2. Goals
- Show at a glance on JustWatch whether a movie or show has been watched.
- For shows, show how far through you are (episodes watched vs. aired).
- For movies you stopped partway, show the playback percent.
- Keep Trakt API usage low: fetch once, cache, and only refresh when Trakt says something changed.

## 3. Non-goals (v1)
- Marking things as watched from JustWatch (write-back to Trakt).
- Ratings, watchlists, or recommendations.
- Browsers other than Chrome/Chromium.

## 4. Data from Trakt

It's not quite one pull. Three calls cover everything, plus one cheap check to avoid re-pulling:

| Purpose | Endpoint | Notes |
|---|---|---|
| Change check | `GET /sync/last_activities` | Tiny response. Only re-fetch the others if timestamps changed. |
| Watched movies | `GET /sync/watched/movies` | Every movie with play count and last watched date. |
| Watched shows | `GET /sync/watched/shows?extended=full` | Every show with watched episodes per season. `extended=full` includes the show's `aired_episodes`, so progress can be computed without one call per show. |
| Partial progress | `GET /sync/playback` | Movies/episodes paused mid-way, with a `progress` percent. |

All requests need headers: `trakt-api-version: 2`, `trakt-api-key: <client_id>`, `Authorization: Bearer <access_token>`.

Each item carries IDs (`trakt`, `slug`, `imdb`, `tmdb`, `tvdb`), which are used for matching (section 6).

## 5. Status Logic

**Movies**
- **Watched**: in `/sync/watched/movies` (plays ≥ 1).
- **In progress**: in `/sync/playback` with progress between 5% and 90%. Show the percent.
- **Watched (treat as complete)**: playback ≥ 90%, even if not scrobbled as watched.
- **Not watched**: none of the above (no badge).

**Shows**
- `percent = watched_episodes / aired_episodes` (count only regular seasons, ignore season 0 specials).
- **Completed / up to date**: watched = aired. Green check.
- **In progress**: 0 < percent < 100. Progress bar plus "12/20 eps".
- **New episodes**: was complete before, but `aired_episodes` has grown. Label "3 new".
- **Not started**: no badge.

The 5% and 90% thresholds should be adjustable in settings.

## 6. Matching JustWatch Titles to Trakt

This is the hardest part and needs a short investigation spike before building.

1. **Preferred: external IDs.** JustWatch's own data (its GraphQL API responses) includes IMDb/TMDB IDs. An injected page script can wrap `fetch` to capture those responses and map each title on the page to an IMDb/TMDB ID, then match on Trakt's `ids.imdb` / `ids.tmdb`. Most reliable.
2. **Fallback: title + year + type.** Read the URL slug (`/movie/<slug>` or `/tv-show/<slug>`) and/or the visible title, normalize (lowercase, strip punctuation and articles), and match against Trakt titles with the same year and type.
3. If neither matches confidently, show no badge rather than a wrong one.

Build a lookup map once after each sync: `imdb → status`, `tmdb → status`, `normalizedTitle|year|type → status`.

## 7. UI on JustWatch
- Small badge in the top corner of each poster: ✓ (watched), percent ring or bar (in progress), "N new" pill (new episodes).
- Optional dimming of fully watched posters (toggle in settings).
- Hover tooltip: "Watched 2 times, last on 2026-08-14" or "Season 3, 12/20 episodes".
- Works on browse grids, search results, lists, and title detail pages.
- JustWatch is a single-page app with infinite scroll, so a `MutationObserver` re-scans new posters as they load.

## 8. Popup
- "Connect Trakt" button (shows Trakt username once connected).
- Last synced time and a "Sync now" button.
- Settings: thresholds, dim watched toggle, show/hide in-progress badges.
- "Disconnect" button.

## 9. Architecture
- **manifest.json**: MV3. Permissions: `storage`, `alarms`, `identity`. Host permissions: `https://api.trakt.tv/*`, `https://*.justwatch.com/*`.
- **background.js (service worker)**: OAuth, API calls, building the lookup map, scheduled refresh via `chrome.alarms` (e.g. every 30 min, only re-pulling if `last_activities` changed).
- **content.js**: finds posters, asks background for statuses, draws badges.
- **inject.js** (optional, for ID capture): runs in page context to read JustWatch GraphQL responses and pass IDs to content.js via `window.postMessage`.
- **Storage**: `chrome.storage.local` for tokens, the cached history, and the lookup map.

## 10. Authentication
- Register an app at trakt.tv → Settings → Your API Apps to get a Client ID and Secret.
- Use the OAuth device code flow (`/oauth/device/code` then poll `/oauth/device/token`): the user enters a short code on trakt.tv. Simple and needs no redirect setup. Alternative: `chrome.identity.launchWebAuthFlow` with the `https://<extension-id>.chromiumapp.org/` redirect.
- Refresh the access token automatically before it expires.
- **Risk:** the token exchange needs the client secret, which would sit inside the extension code. Fine for personal use; for public distribution, move the exchange to a tiny backend.

## 11. Milestones
1. **Skeleton**: manifest, popup, Trakt login working, tokens stored.
2. **Sync**: fetch the three endpoints, compute statuses, cache, `last_activities` check.
3. **Matching spike**: confirm whether JustWatch IDs can be captured; otherwise ship title/year matching.
4. **Badges**: content script, poster detection, MutationObserver, styling.
5. **Polish**: settings, tooltips, new-episode detection, error states (logged out, API down).

## 12. Success Criteria
- 95%+ of watched titles on a typical JustWatch page get the correct badge.
- No false "watched" badges on titles you haven't seen.
- Page load not visibly slowed; badges appear within ~0.5 s of posters rendering.
- Normal use stays well under Trakt's rate limits (most refreshes are a single `last_activities` call).

## 13. Open Questions
- Exactly where JustWatch exposes IMDb/TMDB IDs in its current markup or network responses (needs checking in DevTools).
- Whether JustWatch's DOM class names are stable enough, or if poster detection should rely on link URLs instead.
- Should anime/specials (season 0) count toward progress? Default: no.
