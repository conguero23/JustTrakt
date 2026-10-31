# JustTrakt 1.6.0 (Beta)

Watchlist controls on Trakt movie cards and detail pages:

- Watchlist + adds the exact movie to the account connected to JustTrakt.
- Saved indicates existing membership; click it to remove.
- Visible checking/adding/removing spinners, duplicate-click protection and retryable errors.
- Watchlist and JustWatch share one compact charcoal/orange row, keeping Last seen prominent and posters clear.
- Membership checks share a cached watchlist snapshot. No new site permissions, authentication changes or watched-history writes.

Download **justtrakt-1.6.0.zip**, replace the installed extension files, Reload in
chrome://extensions, and refresh Trakt. The extension ID, login and settings stay
unchanged. Controls use the extension-connected account, which may differ from
the account signed into Trakt's website.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. Automated tests use API/DOM fixtures; the compact
layout is also checked in a local browser preview. Live account testing is still needed.
