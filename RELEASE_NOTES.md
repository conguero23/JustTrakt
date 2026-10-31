# JustTrakt 1.2.0

Your Trakt watch history on JustWatch posters, with show progress, watched dimming,
Trakt percentage ratings, and watchlist controls on hover cards and detail pages.

Download **justtrakt-1.2.0.zip**, extract it to a permanent folder, then open
`chrome://extensions` → Developer mode → Load unpacked → select that folder.
Open the popup and follow its public Client ID + callback instructions to connect
Trakt. No Client Secret, Node.js, backend, or build step is needed to install.

Upgrading: 1.2.0 changes login to PKCE and introduces a stable extension ID. You may
need to reconnect. Keep the new install folder for future manual updates.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. Read the included privacy policy and third-party
notices. Only clicked watchlist adds write to Trakt; watched history is read-only.

Known limits: JustWatch markup can change; ambiguous titles receive no badge.
Automated browser access was blocked by JustWatch, so full live account testing
must be completed before labeling this release stable. No automatic updates.
