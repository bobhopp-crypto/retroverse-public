# Chart Experience V3 — The Living Chart

**Date:** 2026-07-14  
**Scope:** Discovery and design proposal only. No routes, loaders, APIs, database models, or chart calculations were changed.

## Executive decision

Retroverse should treat a Chart Week as a **snapshot of a competitive music ecosystem**, not a directory of one hundred songs. Its job is to make one dated issue legible in seconds: who is rising, who is collapsing, who has arrived, who will not leave, which artists occupy the room, and how this issue differs from the one before it.

The current experience is a solid **song explorer**. V3 should preserve it as the depth layer, then place a compact **week story layer** ahead of it. That combination is Retroverse’s difference: the visitor enters a real historical moment, reads its pressure and change, then follows any participant into its Song, Album, Artist, Year, or neighboring Week experience.

## Why open a Chart Week?

Someone opens a Chart Week to answer four questions:

1. **What happened here?** — the issue’s winners, arrivals, exits, and shocks.
2. **Who is in motion?** — the largest upward and downward moves, plus songs still gathering force.
3. **Who owns the room?** — artists with multiple entries and albums represented in this issue.
4. **Where should I go next?** — into a song’s journey, an artist’s presence, an album’s parallel chart story, the surrounding week, or the broader year.

The Chart Week is therefore the connective tissue between the existing Song, Album, Artist, Year, and chronology views; it should not repeat their full biographies, discographies, or run visualizations.

## Current experience review

### What feels alive

- The page is genuinely dated: the header names a specific issue, rather than a generic all-time list.
- It is a real Hot 100 issue with ranks 1–100, cover art, direct song navigation, playable/searchable music, and ownership state.
- The compact, mobile-first rows make browsing fast; the date stays anchored while a visitor moves through the issue.
- The focus mode turns a song’s surrounding chart context into a useful local neighborhood.
- Existing chronology already forms the right journey: **Year → Month → Week → Chart → Song**.

### What feels like a database

- In full-chart mode, every row communicates the same visual priority. Rank, art, title, artist, play, and library state are repeated 100 times without establishing a story.
- The page loads `prevPosition`, `peakHot100`, and `weeksOnChart` but renders none of them. The actual movement and endurance data is invisible.
- Playback and library markers are operationally useful but are more prominent than the cultural stakes of the issue.
- There is no visible distinction between a debut, a returning title, a small move, a rocket, a collapse, or a long survivor.

### What is repetitive or duplicated

- A full, undifferentiated list duplicates the basic browsing role of the existing Chart hub and song search surfaces.
- A full song run belongs on the existing Song experience’s Chart Journey; a Chart Week should show only the *current week’s consequence* of that run.
- Album discography, artist biography, and year-wide summary should stay on their own pages. At this level they should appear only as concise exits from a week-specific insight.

### What is uniquely Chart Week

- Change since the immediately preceding issue.
- The boundary of the chart: songs entering and songs disappearing.
- The social geometry of an issue: artists with multiple songs, albums represented by multiple tracks, and pressure around the top of the chart.
- A direct, dated comparison to the prior and next published issue.

## Mobile evidence — current chart

Captured from the current local Chart Week at `/week/1978-05-06`, 390 × 844.

### 1. Opening state

![Current 1978-05-06 Chart Week mobile opening](/Users/bobhopp/RETROVERSE_PUBLIC/reports/chart-experience-v3/1978-05-06-mobile-top.png)

**Annotation:** The sticky date, rank, cover, title, artist, and two action affordances are clean and scannable. But the view immediately becomes a homogeneous list. The page gives no reason that this is *May 6, 1978* rather than any other issue: no movement, new arrivals, exits, tenure, chart leader context, or link back/forward through time is shown.

### 2. Scrolling state

![Current 1978-05-06 Chart Week mobile rows](/Users/bobhopp/RETROVERSE_PUBLIC/reports/chart-experience-v3/1978-05-06-mobile-rows.png)

**Annotation:** The row pattern holds up well under scrolling and the cover/title/artist hierarchy should remain. However, identical row treatment flattens major changes into the same visual unit as steady positions. The two trailing controls crowd the limited mobile width while the real narrative values already in the row model—previous rank, peak, and weeks on chart—are absent.

## The V3 proposal

### Information hierarchy

1. **Week masthead:** chart name, date, previous/next issue controls, and a single one-sentence factual issue summary assembled from derived facts (not editorial copy that makes unsupported claims).
2. **The pulse:** 3–5 decisive facts: new entries, exits, biggest climb, biggest drop, longest current tenure, and a stability/turnover read.
3. **The room:** artist and album presence in this issue, limited to meaningful multiplicity.
4. **Chart traffic:** the 100 songs, grouped and visually annotated by state rather than presented as a flat directory.
5. **Connections:** persistent, restrained paths to Song, Artist, Album, Year, prior Week, and next Week.

### Masthead: stand inside the issue

Use the date as a location, not merely a title.

```
< Previous issue       Billboard Hot 100       Next issue >
                         May 6, 1978
              100 songs · [N] new · [E] gone since last issue
```

The final line should be composed only from rows present in the current and adjacent issues. It gives the date a character before a visitor reads a song.

### The Pulse: the week’s factual headline cards

Show only facts that are non-empty and materially distinct:

| Card | Definition from existing chart data | Action |
|---|---|---|
| Biggest climber | Largest positive difference between `prevPosition` and current position | Scroll/focus the song |
| Biggest fall | Largest negative difference between `prevPosition` and current position | Scroll/focus the song |
| New this week | `prevPosition` is null for a current issue row | Open a concise entrant cluster |
| Gone this week | Prior-issue row absent from current issue | Open a concise departures cluster |
| Longest survivor | Highest `weeksOnChart` among current rows | Open the song’s Chart Journey |
| At a peak | Current position equals `peakHot100` | Focus the song; label only, no forecast |
| Returned | Current row has earlier chart history but is absent from the directly previous issue | Link to its Chart Journey run gap |

No synthetic score is required. Ties should render as a small group, not arbitrary winners.

### Chart traffic: let a row carry its state

Retain the existing artwork, title, artist, rank, play, and ownership controls. Add a compact state line under the artist, in a stable order:

```
#14  Shadow Dancing — Andy Gibb
     ↑ 8 from #22 · peak #14 · week 4
```

The state line turns every row from a record into a moment. It needs no new ranking calculation: current position, `prevPosition`, `peakHot100`, and `weeksOnChart` are already present in `ChartWeekPortalRow`.

On mobile, collapse the secondary play/library controls behind one overflow action if needed; never remove the song title, artist, movement, and tenure to preserve operations controls.

Recommended grouping order:

1. **The contenders** — top ranks, with movement shown.
2. **Arrivals** — entries/new returns, if present.
3. **In motion** — strongest climbers and fallers, with ties kept together.
4. **Holding on** — longest-tenured and stable songs.
5. **The full issue** — all 100 ranked rows, preserving the canonical order and accessibility.

These are lenses above the same canonical chart, not filters that obscure it. A song can appear in a short story group and its canonical position in the full issue; the group should always deep-link to the canonical row rather than create a second chart.

### The Room: who owns this week

**Artist presence** can be computed from the current issue only: count chart rows per artist, then surface artists with two or more songs. The card names the artist, number of entries, best rank, and links to Artist.

**Album presence** can use the existing chart-row album association: count current issue tracks linked to an album, then surface albums with two or more represented tracks. It links to Album and does not claim Billboard 200 dominance.

For actual **album chart dominance**, use existing `chart_appearances` rows for `Billboard 200` on the same chart date in a separate, explicitly labeled companion panel. Do not infer album-chart performance from Hot 100 track counts.

### Stable versus chaotic: describe, do not manufacture a score

Show raw components instead of an invented “chaos score”:

- `[N]` new entries and `[E]` exits
- number of upward movers, downward movers, and unchanged positions
- largest absolute weekly move

Use plain language only as a transparent summary, such as “low turnover” when entries/exits are small relative to the 100-song issue, or “high turnover” when they are large. Display the counts beside the language. Avoid an opaque composite metric.

### What happens next

Do not imply a predictive model. Replace forecast language with an honest **Momentum watch**:

- songs climbing this week;
- songs at their current historical peak;
- newly entered songs;
- songs with long current tenure.

When the next dated issue exists, the **Next issue** control becomes the authoritative answer to what happened. It is the valuable Retroverse move: time travel, not simulated prediction.

## Data feasibility: existing data only

| Concept | Existing evidence | Needed presentation work only |
|---|---|---|
| Weekly up/down/same/new | `position` + `prevPosition`; `movementLabel()` already defines up/down/same/new | Render it |
| Peak and tenure | `peakHot100`, `weeksOnChart` already in each chart row | Render and rank within the week |
| Entrants and leavers | Current and prior `chart_appearances` issues | Batch-derived comparison |
| Biggest rise/fall | Current versus prior position | Sort existing deltas; preserve ties |
| Longest survivor | `weeksOnChart` | Max existing value; preserve ties |
| Returning song | Existing historical appearances and Chart Journey’s existing run-gap logic | Reuse run-gap classification |
| Artist ownership | Current issue rows joined to existing artist identity | Group/count rows |
| Album representation | Existing row-level album association | Group/count rows |
| Billboard 200 companion | Existing `chart_appearances` supports Billboard 200 | Separate, correctly labeled query/view model |
| Week-to-week navigation | Existing Year → Month → Week → Chart flow and date route | Present prior/next controls |

## Keep

- The canonical `/week/[date]` destination and the existing chronology flow.
- The current dark RV2 shell, sticky date treatment, mobile density, artwork, rank, title, artist, song link, and focus-neighborhood mode.
- Direct paths from a row to Song, Artist, and linked Album.
- Playback availability and library ownership as secondary utilities.
- The existing Song Chart Journey as the detailed historical run view.

## Remove or demote

- The assumption that the full chart should be the first and only story.
- Equal visual treatment for every row regardless of movement or tenure.
- Empty visual real estate devoted to duplicate action controls before the chart has stated what changed.
- Any attempt to make Chart Week a second Song biography, Artist profile, Album page, or Year summary.
- A fabricated “chaos” index or prediction claim.

## Implementation roadmap

### Phase 0 — Define and verify (no interface redesign)

- Establish exact definitions for entry, exit, return, mover, stable row, and tie behavior against `chart_appearances`.
- Validate edge cases: missing prior issue, chart-size changes, non-consecutive dates, duplicated artist names, and linked-album gaps.
- Capture representative stable, volatile, and return-heavy weeks for visual acceptance criteria.

### Phase 1 — Reveal facts already in the row model

- Render movement, previous rank, peak, and weeks-on-chart in the existing mobile row.
- Add a compact Pulse above the canonical list for biggest climber, biggest fall, new entries, and longest survivor.
- Keep the raw chart as the unchanged source of truth and deep-link all cards back to its rows.

### Phase 2 — Add the week boundary and temporal controls

- Add prior/next published issue navigation.
- Derive and present entering, leaving, and returning groups from existing appearances.
- Add transparent turnover/stability counts and their plain-language summary.

### Phase 3 — Add the ecosystem connections

- Add Artist Presence and Album Representation cards from current issue rows.
- Add a separately labeled same-date Billboard 200 companion panel, only after its source and empty-state behavior are validated.
- Add direct contextual exits: Song’s Chart Journey, Artist chart history, Album, Year, and adjacent Week.

### Phase 4 — Editorial calibration and QA

- Test the hierarchy at 390 px with a stable week, a high-turnover week, a week with ties, and a week with returns.
- Ensure that all summary language exposes the underlying factual count and never presents prediction as fact.
- Verify keyboard order, labels for movement symbols, text equivalents for color, and links from every summary card.

## Definition of success

A visitor should be able to open a dated issue and say, within one screen: “this is the week these songs surged, these songs arrived, this artist had multiple claims on the chart, and this is where I want to go next.” The list remains available, but it becomes the evidence for the week’s story rather than the whole experience.
