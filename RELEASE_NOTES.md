# JustTrakt 1.3.1 (Beta)

Fixes the localhost-only restriction when registering a new Trakt Development app.

1. Create a Development app in Trakt with redirect URI **http://localhost**.
2. Update JustTrakt using **justtrakt-1.3.1.zip**, then Reload in chrome://extensions.
3. In the popup, leave **Personal / development app (code)** selected and enter your public Client ID.
4. Click Connect Trakt and enter the displayed code at **https://auth.trakt.tv/activate**.
5. Approve with the app owner's Trakt account or an invited user, then refresh JustWatch after sync.

No localhost server or Client Secret is needed. Device codes are polled through
auth.trakt.tv with expiry, denial, cancellation and slow-down handling. Existing
connections and the stable extension ID are unchanged. PKCE remains an optional
mode for approved production apps; the chromiumapp.org callback does not work
on Trakt's Development registration form. Production registration is subject to
Trakt's approval process; this release does not bypass app restrictions.

All v1.3 features remain included: watched filters/dates, next episodes, clickable
ratings, matching diagnostics, watchlist add/remove and update notices. No personal
ratings or watched-history write-back.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. Automated authentication tests use mocked responses;
a real-account sign-in is still required to validate your app registration.
