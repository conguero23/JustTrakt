# JustTrakt 1.4.0 (Beta)

- A spinner and clear busy state while checking, adding or removing a watchlist item. Buttons block duplicate clicks until completion and recover on errors; reduced-motion settings are respected.
- A new On Trakt section: Last seen dates on movie covers and information pages on app.trakt.tv and trakt.tv.
- Exact matches against your synced local history, with no extra API calls. Unknown or unwatched movies stay unlabelled. Dates use the extension-connected account, identified in the tooltip.
- A popup toggle lets you turn the Trakt annotations off. JustWatch dates and all previous features remain available.

Download **justtrakt-1.4.0.zip**, replace the files in your permanent extension
folder, click Reload in chrome://extensions, and refresh JustWatch and Trakt.
The stable extension ID and stored connection are unchanged. This version adds
site access to app.trakt.tv and trakt.tv to render the new movie dates.

For a new Development app, register http://localhost and use the default activation
code login with only your public Client ID. No server or Client Secret is needed.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. This remains a beta: Trakt's automated browser view
was blocked, so selectors were checked against its published frontend source and
DOM fixtures. Please verify visual placement in your normal browser session.
