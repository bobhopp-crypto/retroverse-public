# Year Fingerprint — Architecture and Product Design

## Purpose

A Retroverse Year is an ecosystem of chart journeys, not a playlist of annual winners and not a calendar of twelve isolated months. Its fingerprint describes the measurable behavior of the songs, albums, and artists that moved through the charts during that year.

The fingerprint is a common language:

```text
Song   = one chart journey
Album  = a collection of chart journeys (its own, plus its songs where linked)
Artist = a career of chart journeys
Week   = a cross-section of journeys in motion
Year   = an ecosystem of all journeys active in that period
```

This document specifies the vocabulary and data requirements only. It does not prescribe UI, APIs, routes, loaders, schema changes, or a similarity implementation.

## Design principles

- Every attribute must be directly observable in chart history.
- Keep Hot 100 and Billboard 200 behavior separate before any combined editorial interpretation. They have different chart depths and different meanings.
- Preserve a distinction between a journey *active in the year* and a journey that *debuted in the year*.
- Use counts, distributions, and transitions as evidence; do not create opaque editorial or AI scores.
- Translate patterns into plain-language experiences. Raw values and algorithm labels remain internal.
- Do not call a year “different” if the underlying dataset is incomplete or incomparable.

## What the fingerprint contains

The fingerprint has five evidence families. Each family is calculated separately for songs and albums, then may be described together in editorial language.

| Evidence family | What it measures | Public-language translation |
| --- | --- | --- |
| Continuity | How long active journeys remain present, and how concentrated the upper chart is | “The chart held on to its biggest hits.” |
| Arrival and turnover | New journeys entering, departing, and replacing one another | “The sound changed quickly.” |
| Velocity | How journeys rise, stall, peak, fall, or return | “Breakouts arrived fast.” / “Hits built slowly.” |
| Concentration and ownership | Whether a few songs, albums, or artists dominate attention | “A few names owned the year.” |
| Seasonal shape | Whether the year has stable periods, handoffs, or sharply different quarters | “The year turned over in the summer.” |

### 1. Continuity

Internal evidence:

- active journey count and unique entity count;
- chart-run length for journeys active in the year;
- share of active weeks contributed by long-running journeys;
- time spent in the Top 10, Top 40, or equivalent album bands;
- repeat occupancy of leading positions from one week to the next;
- number and duration of re-entry runs.

Public vocabulary:

- “long-running hits”;
- “a year of staying power”;
- “the top of the chart kept changing”;
- “records returned to the conversation.”

### 2. Arrival and turnover

Internal evidence:

- journeys whose first observed week is in the year;
- distinct new entries per chart week, month, and quarter;
- journeys leaving after their final observed week;
- overlap of entities between adjacent weeks/months/quarters;
- replacement rate in the leading bands.

Public vocabulary:

- “new voices arrived all year”;
- “the chart was in constant motion”;
- “a settled field of familiar records.”

### 3. Velocity and journey shape

Internal evidence:

- debut position;
- elapsed chart weeks from debut to peak;
- weekly position change and largest climb/drop;
- sustained climb or decline streaks;
- weeks at peak, weeks at #1, and weeks after peak;
- re-entry count and the span off-chart before a return.

Existing Retroverse chart-journey vocabulary already names several observable shapes: fast rise, steady climb, slow burner, long tail, re-entry, and extended #1 run. At Year scale, use the distribution of those observed shapes rather than assigning a synthetic “year type.”

Public vocabulary:

- “slow-build hits became the story”;
- “songs broke through quickly”;
- “the biggest records had long afterlives”;
- “the chart rewarded repeat returns.”

### 4. Concentration, ownership, and diversity

Internal evidence:

- share of leading-chart weeks held by the top song/album/artist;
- number of distinct #1s and leading-band entities;
- artist share of active chart weeks;
- unique artist count and unique album count among active entities;
- concentration by month/quarter, not only across the full year;
- simultaneous song and album leadership by the same artist when both chart families support it.

Public vocabulary:

- “one artist kept the room”;
- “a crowded field of voices”;
- “albums, not singles, held the center”;
- “the year belonged to a few defining records.”

### 5. Seasonal shape

Internal evidence:

- monthly/quarterly arrival, departure, and active-journey counts;
- dominant entity changes between consecutive periods;
- overlap of leading-band entities between periods;
- movement and longevity distributions by period;
- the first and final active weeks for each journey crossing a period boundary.

Public vocabulary:

- “a spring handoff changed the year”;
- “summer held its grip”;
- “the final months opened a new chapter.”

## What exists today

### Current Year payload: useful but deliberately narrow

The current Year loader returns only weekly #1 snapshots from Billboard Hot 100 and Billboard 200 for the requested year. Each row includes chart date, chart position, weeks on chart, chart family, track/album identifier, title, artist, cover, and album release year where applicable.

This already supports, without any new data:

- distinct #1 song and album count;
- #1 tenure and #1 concentration;
- #1 artist and album dominance;
- month-by-month leader handoffs;
- leader diversity;
- the known annual leader chronology.

It cannot honestly answer whole-chart questions such as overall turnover, average longevity, rapid climbing, or diversity of the full chart because non-#1 rows are intentionally absent.

### Existing chart history and journey logic

Retroverse already has the building blocks for complete journey analysis:

- `chart_appearances` provides weekly date, position, weeks-on-chart, and chart name for track and album appearances;
- the existing chart-history types carry date, rank, weeks-on-chart, chart family, identity, and cover information;
- trajectory conversion derives weekly movement, debut/re-entry state, delta, and a running peak from ordered rows;
- chart-journey logic derives runs, peak, Top 10 and #1 tenure, uninterrupted duration, climb/decline streaks, biggest moves, and returns;
- album chart features already derive debut, peak, time to peak, total chart weeks, #1 tenure, re-entry, rebound, decline, and post-peak longevity;
- artist and album identities are available through the existing joins used by chart-history queries.

## Metrics derivable without database changes

The following need complete existing weekly chart appearances for a year. They require a future read/aggregation path, but no table, column, API, route, or data-model change.

| Metric group | Derivation from existing rows |
| --- | --- |
| Chart stability | Compare entity overlap in adjacent weekly snapshots; measure how often leading positions retain the same entity. |
| New-entry cadence | For each entity/chart run, identify the first observed week; group those first weeks by month or quarter. |
| Journey longevity | Group weekly rows by entity and chart; use the observed run length and existing `weeks_on_chart`. |
| Long-running hits | Count/share journeys above a transparent duration threshold or relative to the catalog distribution. |
| Fast/slow climbers | Order each run by date; calculate weeks from debut to best rank and the weekly rank deltas. |
| Peak concentration | Count weeks held by the same entities in #1, Top 10, and other defined bands. |
| Dominant artists/albums | Roll entity active weeks and leading-band weeks up to existing artist or album identity. |
| Artist/album diversity | Count distinct canonical artists/albums active in each period and their distribution of active weeks. |
| Song turnover | Compare unique songs entering, leaving, and persisting between adjacent periods. |
| Seasonal movement | Compute every preceding metric per month/quarter and compare adjacent periods. |
| Cross-chart resonance | Compare the active weeks and leadership periods for an artist’s songs and albums across the two chart families. |

Where `weeks_on_chart` and observed rows disagree, the observed contiguous weekly sequence should be the primary evidence for a year-boundary analysis; the stored weeks-on-chart field remains useful for the journey’s lifetime context outside the year.

## Future enhancements, if needed

None of these are required for the first fingerprint. They would improve confidence, detail, or interpretation later.

| Enhancement | Why it helps | Why it is not required now |
| --- | --- | --- |
| A canonical artist ID and canonical album ID in the public chart-history projection | Makes aggregation resilient to naming variants and collaborations. | Existing joins already resolve canonical identity internally. |
| Explicit weekly `last_week` / movement in chart rows | Avoids recomputing deltas and preserves source-provided movement semantics. | Movement is deterministically derivable from adjacent existing rows. |
| Chart-boundary completeness and provenance flags | Prevents false claims when a chart’s early/late coverage is partial. | The first version can limit itself to well-covered years and disclose no fingerprint where evidence is insufficient. |
| Collaboration/billing normalization | Distinguishes solo, featured, and group credit concentration. | Basic artist diversity and leader ownership work with current artist identity. |
| Genre, format, sales, airplay, or streaming dimensions | Adds cultural explanation beyond chart behavior. | These are outside the required chart-journey fingerprint and must not be inferred. |

## Similar Years: feasibility and minimum data

Yes—comparison is feasible from chart history alone, but it should compare *patterns*, not declare cultural equivalence.

### Minimum comparable fingerprint data

For every candidate year and for each chart family independently:

1. weekly date;
2. chart family and chart depth;
3. canonical song/album identity and canonical artist identity;
4. weekly position and weeks-on-chart;
5. a complete or explicitly qualified coverage range.

From those fields, calculate the same evidence families above at the same period granularity. Preserve the raw component values and dataset coverage metadata with the fingerprint.

### Eventual matching approach

1. Exclude years or chart families that fail coverage checks.
2. Build a transparent vector of comparable components: continuity, arrival, velocity distribution, ownership/diversity, and seasonal-shape components, separately for songs and albums.
3. Normalize each component across the comparable year catalog so chart depth and scale do not dominate the result.
4. Rank candidates by closeness across the components; do not expose the distance or a proprietary score.
5. Produce a human-readable reason only from components that materially align, for example: “Both years were defined by durable leaders and a slow-moving top tier.”
6. Keep several distinct reasons available so a result does not imply that one shared trait makes two years identical.

The existing album chart-similarity work demonstrates that transparent feature vectors and normalized differences are viable inside Retroverse. A Year comparison should reuse the principle, not copy album-specific weights or labels.

## Public translation contract

The product exposes meaningful observations, never implementation metrics. A single evidence family can support several editorial statements, but every statement must be traceable to a measured condition.

| Measured pattern | Permitted public expression |
| --- | --- |
| Long active runs dominate weekly presence | “This year favored long-running hits.” |
| High new-entry and replacement cadence | “The chart kept finding new arrivals.” |
| Many journeys take extended time to peak | “The year rewarded songs that built slowly.” |
| A small set of artists holds a large share of leading weeks | “A few artists defined the year.” |
| Low overlap between adjacent periods | “The year changed shape as it went.” |
| One period’s leaders persist across later periods | “Summer held on well into the year.” |

Avoid: numerical averages, medians, percentile labels, database terminology, opaque similarity scores, and culture/genre claims unsupported by the chart data.

## Recommended reusable fingerprint schema (conceptual only)

The future shared language should represent evidence, not an opinionated score:

```text
Fingerprint
  scope: song | album | artist | week | year
  chartFamilies: [song-chart evidence, album-chart evidence]
  coverage: observed date range and completeness qualification
  continuity: duration, persistence, re-entry evidence
  arrival: entry and departure evidence
  velocity: debut-to-peak and weekly-motion evidence
  ownership: entity and artist concentration evidence
  diversity: distinct-entity and distribution evidence
  seasonalShape: period-by-period transition evidence
  publicPhrases: traceable translations selected from the evidence
```

At Song scale, the evidence is a single journey. At Album scale, it is the album’s journey plus linked song journeys when coverage exists. At Artist scale, it is the aggregate of all credited journeys. At Week scale, it is the active chart cross-section. At Year scale, it is the complete set of active journeys and their handoffs.

## Scope confirmation

This sprint makes no implementation changes. The document is based on existing chart rows and existing chart-journey/album-feature logic. No routes, loaders, APIs, database models, chart calculations, React, CSS, or similarity engine were changed.
