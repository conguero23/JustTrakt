# Changelog

## 1.7.3 - 2026-10-31

- Fill native image/picture wrappers so poster artwork reaches the bottom of grid cards.
- Reset native footer sizing and offsets to keep ratings inside a compact gradient footer.
- Move clipped circular controls inside the poster without replacing their handlers.
- Restore artwork wrappers and controls when disabling JustWatchIt.

## 1.7.2 - 2026-10-31

- Fix JustWatchIt turning on without applying poster styles to nested or positioned cards.
- Remove the four-wrapper detection limit and support direct main children, deep wrappers and positioned slots.
- Reset native fixed row sizing in grid mode and restore it on disable.
- Report poster counts beside the toggle and retain movie filtering in grid mode.

## 1.7.1 - 2026-10-31

- Move JustWatchIt into the on-page filter bar beside Last seen before; remove the popup button.
- Add a page toolbar on show-only grids and retain the selected layout when saving popup preferences.
- Style the poster-grid mode with dark blue surfaces, lime accents and hover details.

## 1.7.0 - 2026-10-31

- Add the reversible JustWatchIt experiment beside Movie last-seen dates in the popup.
- Display supported Trakt movie/show grids as responsive poster walls, retaining native links, ratings and hover/focus controls.
- Handle new cards and settings changes without replacing page content; leave incompatible positioned lists unchanged.

## 1.6.2 - 2026-10-31

- Show last-seen dates only for movies, on both posters and detail pages. Show progress and watched badges remain available.

## 1.6.1 - 2026-10-31

- Put watch counts beside Last seen as (2) on Trakt movie cards and detail pages, removing the separate count row.
- Keep counts in sync when history or display settings change.

## 1.6.0 — 2026-10-31

- Add Watchlist + / Saved controls to Trakt movie cards and movie detail pages.
- Check existing membership through a shared five-minute watchlist snapshot; resolve exact Trakt slugs only when writing.
- Add/remove uses explicit clicks, loaders, duplicate-click protection and inline retryable errors.
- Fit Watchlist and JustWatch actions in one charcoal/orange row beneath Last seen.

## 1.5.2 — 2026-10-31

- Match Trakt's charcoal/white/orange UI across card tools and browsing filters.
- Make Last seen prominent with a labelled, localized date and a restrained orange marker.
- Remove Note actions from movie cards and information panels; keep existing local notes untouched.
- Use a single full-width JustWatch action with a small orange external-link indicator.

## 1.5.1 — 2026-10-31

- Move last-seen dates, counts and actions off summary-card posters into the right-hand details column.
- Compact, aligned JustWatch/Note buttons and quieter typography, preserving native metadata and bottom ratings.
- Avoid duplicate tools on detail-page posters and prevent recommendations from inheriting the current movie's date.
- Add a summary-card placement/restoration regression test and visually inspect a compact-card preview.

## 1.5.0 — 2026-10-31

- Trakt movie filters: unwatched only/hide watched, last-seen-before date and minimum/maximum watch count, with Show all/reset.
- Movie watch-count labels and rewatch reminders strictly after three calendar years.
- Find on JustWatch actions on Trakt covers and information pages, with a configurable country code. These open title searches rather than displaying unverified provider listings.
- Private local notes in an extension-owned editor, with save/delete, length limits and concurrent-edit protection. Disconnect clears saved notes.
- No new site permissions or watched-history writes.

## 1.4.0 — 2026-10-31

- Animated, accessible loading indicators for checking, adding and removing watchlist items, with duplicate-click protection and reduced-motion support.
- Last seen movie dates on Trakt's own covers and information pages, matched by exact cached slug/ID without extra API calls.
- New On Trakt preference to disable last-seen annotations; tooltips identify the extension's connected account.
- Restore dates after page updates and clear them on disconnect/navigation. JustWatch's existing last-watched dates remain unchanged.
- Adds content-script access to app.trakt.tv and trakt.tv for the new section.

## 1.3.1 — 2026-10-31

- Fix registration for personal development apps, which accept localhost redirects only.
- Default to secret-free device-code login using auth.trakt.tv; register http://localhost in Trakt, with no server needed.
- Retain PKCE as an explicit option for approved production apps.
- Resume pending device authorization after popup closure, honor polling intervals/429 backoff, and handle cancellation, denial and expiry.
- Document development-app owner/invited-user restrictions instead of implying production access is freely available.

## 1.3.0 — 2026-10-31

- Optional hide-watched filter with a Show all control; detail pages stay accessible.
- Add/remove Trakt watchlist controls with cached membership and inline errors.
- Trakt ratings link directly to the matching movie or show on Trakt.
- Next episode and remaining aired count on show pages, fetched on demand.
- Last-watched dates on movie posters/detail pages; show dates only after more than one calendar year.
- Optional missing-badge diagnostics and expandable matching details on title pages.
- Daily public GitHub release checks, manual check and popup update notices, with an off switch.
- Watched history remains read-only. No personal-rating feature added.

## 1.2.0 — 2026-10-31

- PKCE browser login through auth.trakt.tv; no Client Secret input or storage.
- Single shared refresh operation to protect single-use refresh tokens.
- Stable unpacked extension ID, original extension icons, bundled privacy page.
- Privacy policy, MIT software license, third-party notices and security guidance.
- Repeatable install/source ZIPs with SHA-256 checksums and GitHub CI workflow.
- Includes watched/progress/new-episode badges, dimming, Trakt percentage ratings,
  and authenticated watchlist controls on hover cards and detail pages.

## 1.1.2

- Movie/show detail hero ratings and independent watchlist controls.

## 1.1.1

- Trakt icon and percentage ratings; cached watchlist membership and click handling.

## 1.1.0

- Trakt ratings and user-initiated watchlist adds.

## 1.0.1

- Restore badges after JustWatch DOM updates; explicit show percentages.
