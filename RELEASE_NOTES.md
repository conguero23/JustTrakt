# JustTrakt 1.3.0 (Beta)

- Hide watched cards, with a floating Show all control to undo the filter.
- Remove saved titles by clicking their In Trakt watchlist button.
- Click Trakt percentage ratings to open the matched title on Trakt.
- Show detail pages display the next episode and remaining aired count.
- Movies display last-watched dates. Shows display them only when last watched more than one calendar year ago.
- Optional missing-badge tooltips and expandable matching details on title pages.
- Daily GitHub update checks, manual checking and popup download notices. Checks can be disabled. No account data is sent to GitHub.

Download **justtrakt-1.3.0.zip**, extract into your permanent extension folder,
then click Reload in chrome://extensions and refresh JustWatch. New users:
enable Developer mode, Load unpacked, and connect Trakt with the public Client ID
and redirect URL instructions in the popup. The stable extension ID is unchanged
from 1.2.0. No Client Secret, Node.js or backend is needed to install.

Updates are manual. Next-episode data loads on show detail pages and is cached
for 15 minutes. Hide-watched filters loaded cards, not JustWatch search totals.
Watched history stays read-only; watchlist writes happen only on your clicks.
There is no personal-rating feature.

JustTrakt uses Trakt but is not endorsed or certified by Trakt. Independent project,
not affiliated with JustWatch. Read the included privacy policy and third-party
notices. This remains a beta: automated tests use mocked Trakt responses and DOM
fixtures; live account behavior and changing JustWatch markup require user testing.
