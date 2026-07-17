# Retroverse Navigation V3

Implemented on `main` in `/Users/bobhopp/RETROVERSE_PUBLIC`.

## Global navigation

The public experience now has one shared global navigation bar containing:

- Retroverse wordmark, routed through the canonical public-entry destination.
- Return to Live, hidden on the Live route.
- Search.
- BobOS owner settings, rendered only for an authenticated owner session.

## Navigation removed

- The RV2 destination tab row: duplicate Return to Live, Live, Search, Years, and Charts links.
- The RV2 destination-page “Global Search” panel: label, search field, clear/submit control, and form.
- The broadcast-shell top row: Broadcast Status and its duplicate Search link.
- The global Home pill, because the Retroverse wordmark owns public-entry navigation.
- The publicly visible BobOS pill and unauthenticated admin/sign-in menu state.
- Album’s fixed `← Search` link, replaced by the shared contextual Back component.
- Artist’s fixed `← Search` link, replaced by the shared contextual Back component.
- Chart Week’s fixed `← Back` link and song/current-week fallback behavior, replaced by the shared component with a parent-month fallback.
- The Chart Week loading state’s nonfunctional `← Back` text.
- Page-specific rules that hid the global bar on Live, Song, and Year destinations in favor of duplicate local navigation.

## Shared Back behavior

- An internal Retroverse history entry uses browser Back.
- A direct Song, Album, Artist, Year, or Charts Hub entry falls back to Search and is labeled `Search`.
- A direct Chart Week entry falls back to its parent month and is labeled with that month and year.
- A direct chronology month falls back to its year; a direct chronology week falls back to its month.
- Browser Back and Forward retain their native history entries.

## Mobile screenshots (390 × 844)

- [Song](./mobile/song-mobile.jpg)
- [Album](./mobile/album-mobile.jpg)
- [Artist](./mobile/artist-mobile.jpg)
- [Year](./mobile/year-mobile.jpg)
- [Chart Week](./mobile/chart-mobile.jpg)

## Protected surfaces

Navigation V3 did not change route definitions, URLs, loaders, APIs, or database models.

