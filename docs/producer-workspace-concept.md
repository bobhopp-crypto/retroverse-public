# 1967 Producer Workspace — Concept

## What this is

The **Producer View** is an experimental second layout on the Year Workspace (`/ops/year/1967`). It does not replace the classic workspace. It behaves like a **television station rundown board**: assets on the left, the night's show structure on the right, and a **Show Readiness** strip across the top.

Classic workspace still owns acquisition workflow (Wanted → Queued → Acquired → Approved), Billboard song reconciliation, recommendations, source discovery, and drop zones. Producer View reads that same data and adds a **show timeline** stored separately at:

`RETROVERSE_DATA/ops/year-workspace/{year}/producer/timeline.json`

## Need / Found / Ready

Producer language maps to existing production sections:

| Producer | Classic workspace |
| -------- | ----------------- |
| **Need** | Wanted + Queued + Acquired + Approved (total slots in the pipeline) |
| **Found** | Acquired + Approved (media located) |
| **Ready** | Approved (cleared for air) |

**Missing** (shown when &gt; 0) = Need − Ready — assets still not cleared for broadcast.

Songs use Billboard reconciliation: chart-only = Need; in library without performance keywords = Found; tagged with keywords = Ready.

No percentages on the producer dashboard — only counts.

## Show Readiness dashboard

Top row tracks five pillars for a full 1967 night:

- Songs
- Commercials
- TV Clips
- Events
- Bumpers

Use this as a stand-up check before you lock the rundown: if **Missing** is high on Commercials or TV Clips, you are not ready to rehearse timing.

## Asset library (left)

Shelves: Songs, Albums, Commercials, TV Clips, Movies, Sports, News, Events, Bumpers, Promos.

Each shelf lists assets in three columns:

- **Need** — still hunting or in queue
- **Found** — file/source attached, not approved
- **Ready** — approved for show

Movies / Sports / News share curated pools with Promos / Events until dedicated pools exist; they appear as separate shelves for producer thinking, not separate files.

Drag any asset chip onto a timeline block.

## Show timeline (right)

Blocks model a single 1967 evening (order is producer-defined, not enforced):

1. **Opening** — cold open, station ID, first energy
2. **Music Block** — Billboard spine, singalongs, dance floor
3. **Commercial Break** — period ads, sponsors, bumpers in/out
4. **TV Memory** — clips, promos, couch moments
5. **News Moment** — headlines, wire, local color
6. **Feature Segment** — sports, movies, deep cut, event hook
7. **Closing** — last songs, sign-off, night cap

Dropping an asset **copies a reference** into the block (it does not move production state). Remove clears the rundown slot only.

## How a producer builds a complete 1967 night

### 1. Morning — inventory the pillars

Open **Producer View**. Read **Show Readiness**:

- Fill **Songs** in classic Workspace (Billboard chart-only → match VDJ → tag performance keywords).
- Generate recommendations for Commercials, TV Clips, Events, Bumpers; work acquisition until **Ready** counts match your target night.

### 2. Midday — classic workspace acquisition

Switch to **Workspace** for real work:

- Wanted → Find Sources → Acquisition Queue → drop files → Acquire → Approve.
- Media Lab for long-form TV (transcript, chapters, segment labels) stays on the classic path.

Producer counts update on refresh.

### 3. Afternoon — sketch the rundown

Back in **Producer View**:

1. **Opening** — one bumper + station promo (Ready bumpers/promos).
2. **Music Block** — drag Ready songs in set order (hardest peaks / singalongs first).
3. **Commercial Break** — 2–3 Ready commercials; note Missing if under target.
4. **TV Memory** — Ready TV clips + promos that match the break tone.
5. **News Moment** — event or news-flavored clip from Events shelf.
6. **Feature Segment** — sports or movie promo + one “hero” album track if needed.
7. **Closing** — final Music Block songs + sign-off bumper.

### 4. Rehearsal — gap check

Walk the timeline top to bottom:

- Any block empty? Pull from **Need** shelves or switch to Workspace to acquire.
- Any block only **Found** not **Ready**? Approve in classic workspace before show night.

### 5. Lock — export mentally to VDJ

Retroverse does not auto-play the rundown. The timeline is the **producer’s map**; VirtualDJ playlists and tagged MP4s remain source of truth. The rundown tells you *what* must exist and *where* it sits in the emotional arc of the night.

## Design intent

- **Rundown board**, not a CMS — fast visual gaps, not another metadata form.
- **Additive** — timeline JSON never overwrites canonical production files.
- **1967-first** — curated recommendation providers and pilot year; layout works for other years with empty shelves.

## Switching views

On `/ops/year/{year}`, use **Workspace** vs **Producer View** in the header. Same API (`/api/ops/year-workspace`); timeline PATCH ops: `producerAddToBlock`, `producerRemoveFromBlock`.
