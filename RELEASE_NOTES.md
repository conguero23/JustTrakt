# JustTrakt 1.5.0 (Beta)

All requested Trakt movie tools, with the rewatch threshold set to more than **3 years**:

- Hide watched / unwatched-only browsing.
- Last-seen-before date and min/max watch-count filters with Show all / Reset.
- Seen N times labels on covers and information pages.
- Rewatch reminders only after strictly more than three calendar years.
- Find on JustWatch actions, using a configurable two-letter country code. Links open title searches; provider availability is not fetched or claimed.
- Private local notes in an extension-owned editor, with save/delete and concurrent-edit protection. Note text is never sent to services or inserted into Trakt's page DOM. Disconnect/uninstall deletes notes.

Download **justtrakt-1.5.0.zip**, replace the files in your permanent extension
folder, Reload in chrome://extensions, and refresh Trakt and JustWatch. Connection
and extension ID stay unchanged. No new host permissions. Settings are in the
popup's On Trakt section; browsing filters appear on Trakt movie grids.

Filters affect loaded cards only. Unknown history stays visible until sync. Notes
have no backup and are limited to 4,000 characters/movie and 1,000 movies, subject
to browser storage quota. All previous features remain; watched history stays read-only.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. This is a beta tested with mocked API/DOM fixtures;
normal-session visual verification is still needed because automated access was blocked.
