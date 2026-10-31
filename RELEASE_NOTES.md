# JustTrakt 1.7.2 (Beta)

Fixes JustWatchIt changing button color without changing card layout.

Grid detection no longer stops after four wrappers or skips positioned slots.
It supports direct main children and nested movie/show cards, overrides fixed row
sizing in grid mode, and restores native layout when switched off.
A poster count appears beside the button; missing posters are reported explicitly.

Download **justtrakt-1.7.2.zip**, replace ALL installed extension files,
Reload in chrome://extensions, then refresh Trakt tabs to load the updated CSS
and content script. Your login and settings remain.

Validated with regression tests and browser measurements of a deeply nested,
positioned card fixture: 330x220 cards become approximately 161x241 posters,
and switching off restores 330x220 cards and native slot positioning.
Live Trakt access was unavailable during validation.
