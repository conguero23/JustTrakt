# Changelog

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
