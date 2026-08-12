# Editorial Song Experience Prototype — “She’s a Beauty”

## Collector material available

- Canonical identity: `RVTR111098`, The Tubes, “She's A Beauty”
- Canonical chart year: 1983; album: *The Tubes* (1975)
- Complete Hot 100 Chart Journey: 20 weekly appearances, debut #82, peak #10, final week #100
- Existing SongPackage with two locked story cards and an American Songwriter source
- Existing video-derived hero: `data/ops/intelligence/research-department/RVTR111098/visual-assets/hero-video.jpg`
- Existing canonical album cover, artist/album/year links, VDJ coverage metadata, and chart-week links

The packet remains unchanged as Collector material. The public article is a separate derived Editor artifact in `editorial-song-prototype.ts`.

## Editor output

Headline: **A strange little world made for the first MTV generation**

The article is five continuous paragraphs (approximately 550 words) plus one unobtrusive research-note link. It leads with the peep-show premise, connects the song’s discomfort to its polished pop frame, then moves through the chart moment, early MTV visual language, and why the song remains memorable. It omits generic Trivia, Timeline, Overview, Why It Mattered, and card-by-card source repetition.

Retained: video hero, title/artist/year, minimal orientation links, complete Chart Journey, one article, related music, global Ask Arvey, and external discovery links.

Removed for this prototype: `DEFINING MOMENT`, `The Story`, `TRIVIA`, and `TIMELINE` presentation sections; the underlying packet fields remain available for regeneration, provenance, Arvey context, and debugging.

## Chart-trajectory related music

The prototype calculates a small distance over existing Hot 100 data using debut position, weeks to Top 40, weeks to Top 10, peak position, total chart weeks, and average per-week movement. The three closest existing trajectories are:

1. **Take It Easy On Me** — nearly identical climb into the Top 40 and Top 10.
2. **It Only Takes A Minute** — nearly identical climb into the Top 40 and Top 10.
3. **De Do Do Do De Da Da Da** — nearly identical climb into the Top 40 and Top 10.

This is intentionally a prototype matcher, not a production recommendation engine. Future hierarchy: use trajectory similarity when Chart Journey exists; use Editor/AI context recommendations when it does not; fall back to same-artist music only when information is insufficient.

## Verification

- 375px, 390px, 430px, and 1280px verified
- Full 390px screenshot: `reports/editorial-song-prototype-111098-390.png`
- Chart Journey: 20 rows retained
- Ask Arvey: exactly one
- Primary Search controls: zero
- Horizontal overflow: none at all four widths
- Console/page errors: none
- Legacy cream shell: not present
