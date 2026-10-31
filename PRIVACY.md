# JustTrakt privacy policy

Effective October 31, 2026. Applies to the unmodified JustTrakt extension.

JustTrakt is an independent browser extension. It has no
developer-operated backend, analytics, ads, telemetry, or crash-report service.

Updated for version 1.3.0: GitHub release checks and clicked watchlist removals
are described below.

Version 1.4.0 also reads movie paths from Trakt's rendered movie links and the
current movie-page URL to match them against your existing local history. It
displays Last seen dates on covers and information pages, using the account
connected to the extension, which may differ from the website's signed-in account.
This feature performs no extra title/history API calls and can be disabled under
On Trakt in the popup. Access to app.trakt.tv and trakt.tv is used to render these
annotations; no page cookies, form contents or website session tokens are read.

Version 1.5.0 adds local watch-count/date filters and rewatch reminders for movies
last watched strictly more than three calendar years ago. Filter preferences are
stored locally. Clicking Find on JustWatch opens a search page for that movie
title in your selected country; JustWatch receives that normal navigation/query
only when clicked. The extension does not fetch provider availability in the background.

Private movie notes are entered on an extension-owned page, not inserted into
Trakt's page DOM, and stored only in local extension storage. Note text is never
sent to Trakt, JustWatch, GitHub or the developer. Limits are 4,000 characters per
movie and 1,000 movies, subject to the browser's local storage quota. Notes remain
until deleted, Disconnect, or uninstall. Disconnect deletes all saved notes.
There is no backup or server recovery. Browser-profile access can expose notes;
they are not encrypted by this extension.

## Data used

- Your public Trakt Client ID and OAuth access/refresh tokens, to connect to Trakt.
- Your Trakt username, watched history, episode/playback progress, and watchlist.
- Title metadata on JustWatch pages you open: movie/show paths, titles, years,
  and external IDs such as IMDb/TMDB IDs. The extension observes JustWatch title
  responses and initial page data; it does not collect a general browsing history.
- Your display preferences, sync timestamps, cached ratings, and error messages.

## Storage and transmission

Data is stored in `chrome.storage.local` in your browser profile, not Chrome Sync.
This is not an encrypted vault; protect access to your computer and profile.
The optional production PKCE flow uses an ephemeral verifier in service-worker memory; the extension
does not request, ship, or retain a Trakt Client Secret or Trakt password.

Personal development apps use device-code authentication. Temporary device/user
codes and their polling/expiry metadata are kept locally until approval,
cancellation, denial or expiration is processed. Only the public user code is
displayed in the popup; the private device code is sent only to Trakt's auth host.
This flow does not contact localhost or run a local server.

Trakt receives authentication requests, title lookups, account/history/watchlist
requests, and watchlist adds when you click Add. Title IDs or title/year search
queries are sent to Trakt for matching and ratings. Network requests use HTTPS.
The extension does not send your Trakt tokens to JustWatch or the developer.
JustWatch continues receiving its normal website requests. Trakt and JustWatch
have their own privacy policies and may receive normal connection information
such as your IP address.

When update checks are enabled (the default), opening the popup can send one
public release-list request per day to GitHub. Check for updates can request it
immediately. This request sends no Trakt credentials, watch history, JustWatch
title data, or extension identifier. GitHub receives ordinary connection details
such as your IP address. Disable checks in preferences to stop these requests.
No extension code is downloaded or executed automatically; installation stays
manual. Clicked watchlist removals are sent to Trakt. Show pages request watched
progress on demand to display the next episode, cached for 15 minutes (up to 300
shows). Last-watched dates come from your existing watched-history sync.

## Retention and control

History and tokens remain until you disconnect or uninstall. Display preferences
remain after Disconnect. Ratings expire logically after 24 hours, with at most
1,500 cached title records; expired records may remain until replaced or cleared.
Watchlist snapshots expire logically after five minutes and remain on disk until
replaced or cleared. Cached history may be retained during network outages.

Disconnect deletes locally held account credentials, history, watchlist snapshots,
ratings, and matching data. It does not delete or reverse anything in your Trakt
account and does not revoke the app's authorization server-side. You can revoke
that authorization in Trakt's connected-app settings. Uninstall to remove the
extension's remaining settings. The developer holds no server-side copy to delete.

Disconnect also clears show-progress caches. Public GitHub update metadata and
display preferences are retained; uninstall removes them.

## Support and changes

Use the repository's Issues tab for general questions. Never post tokens, Client
Secrets, full storage exports, or personal watch history in public issues.
For a sensitive report, follow SECURITY.md. Changes to these practices will be
documented with a policy update and release notes before the changed behavior ships.
