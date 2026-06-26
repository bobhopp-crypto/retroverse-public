# Patron Value Audit — RVTR164626 (Johnny Cash — I Walk the Line)

**Batch:** Studio Alpha 001 A2  
**Score:** 5.5 / 10 (Fair) — **Needs More Research**  
**Compared to:** Soho 9.0, Squeeze 8.3, Danzig 8.0 (same batch)

---

## Executive summary

**The low Patron Value is not caused by visuals, performance choice, or video-era bias.** Cash scores **10/10 performance** and **8.5/10 visual** — among the best in the batch. The 5.5 is almost entirely **research + narrative input failure**: the Collector package has wrong release metadata, no chart/cultural facts, duplicate trivia-only accepted facts, and a rewrite that correctly mirrors that thin material. The Patron Value algorithm then penalizes the resulting encyclopedia-style hook and short body.

---

## Side-by-side (Cash vs top scorers)

| Dimension | Cash (5.5) | Soho (9.0) | Squeeze (8.3) |
|-----------|------------|------------|---------------|
| **Patron Value** | 5.5 | 9.0 | 8.3 |
| **Visual Quality** | 8.5 | 9.0 | 9.0 |
| **Performance Quality** | **10.0** | 9.5 | 9.5 |
| **Collector confidence (overall)** | 53 | 81 | 84 |
| **Missing areas** | **4** | 1 | 1 |
| **Hot 100 peak** | **null** | 14 | 49 |
| **Identity year (graph)** | **1969** | 1990 | 1981 |
| **Performance detected year** | **1956** | 1990 | 1981 |
| **Accepted facts** | 5 (2 duplicates) | 7 | 11 |
| **Wikipedia / cultural facts** | **0** | 3+ | 6+ |
| **fullStory length** | **212 chars** | 536 | 566 |
| **Hook** | "I Walk The Line was released in 1969." | Long band bio (Wikipedia) | "Tempted" is a song by… |
| **Story angle** | live_performance | cultural_moment | cultural_moment |
| **Recommendation** | Needs More Research | Ready for Director | Ready for Director |

---

## Root-cause analysis (hypothesis checklist)

### 1. Missing research — **PRIMARY CAUSE**

Collector `missingAreas` (all four):

- Billboard chart history
- Recording session details
- Cultural context sources
- Artist relationship depth

Confidence domains: **recording 20, charts 25, culture 20** vs performance **85**.

**Canonical graph error:** Identity year is **1969** (compilation *Original Golden Hits, Volume I*), not the original 1956 single. Accepted facts repeat that wrong year three times. Meanwhile the owned performance video is **Man in Black Live in Denmark** with **detected year 1956** — a direct narrative contradiction the pipeline never resolves.

No Hot 100 peak is linked despite this being one of the most chart-significant country recordings ever. No Wikipedia enrichment ran (pending facts are only VDJ file paths).

`buildEditorialReview()` flags **Needs More Research** because `missingAreas.length >= 4` — independent of Patron Value.

### 2. Weak accepted facts — **PRIMARY CAUSE**

Five accepted facts in Editor:

1. I Walk The Line was released in 1969. *(wrong framing)*
2. Album: Original Golden Hits, Volume I (1969). *(duplicate theme)*
3. VirtualDJ library play count: 9.
4. Album: Original Golden Hits, Volume I (1969). *(duplicate)*
5. Album: Original Golden Hits, Volume I (1969) *(duplicate)*

None match the cultural-impact regex used for scoring (`legend`, `iconic`, `changed`, etc.). Compare Squeeze: 11 accepted facts including songwriting, vocalist change, album context, and chart run.

### 3. Poor story angle — **SECONDARY (data-driven)**

Angle `live_performance` is reasonable given the owned video, but **storySeed** still anchors on the 1969 compilation:

> *"Johnny Cash's I Walk The Line captures a 1969 moment in the catalog."*

The live performance (Denmark, 1956-era cut) is never woven into hook or body. Angle and facts are misaligned.

### 4. Rewrite quality — **SECONDARY (symptom, not root)**

A2 rewrite output is thin but faithful to inputs:

- **Hook:** "I Walk The Line was released in 1969."
- **Body:** 212 chars, 4 short paragraphs repeating release/album/placeholder "Release moment — 1969…"

Rewrite rules fallback correctly avoided encyclopedia facts in some cases, but with only metadata facts available, it had nothing else to say. OpenAI path likely failed or was skipped (same pattern as other batch songs using rules fallback).

### 5. Performance metadata — **NOT A CAUSE**

Performance scores **10/10**. Rationale is strong: Denmark venue, 5 frames, 1956 anchor. This dimension is working; it does not feed Patron Value today.

### 6. Visual weighting — **NOT A CAUSE**

Visual **8.5/10** (5 extracted frames, hero + performance approved). Same extraction pattern as Soho/Squeeze. Visual quality is separate from Patron Value.

### 7. Algorithm bias toward flashy / video-era songs — **PARTIAL, INDIRECT**

No explicit video-era term in `computePatronValue()`. **Indirect bias:**

| Mechanism | Effect on pre-1970 / heritage songs |
|-----------|-------------------------------------|
| Length bonuses (`fullStory >= 400/700`) | Favors Wikipedia-rich recent tracks |
| Fact-count bonuses (`>= 7`) | Favors graph + chart + wiki pipeline output |
| Cultural-fact keyword bonus | Favors songs with "legend/icon/changed" in fact text |
| Hook penalty `"was released in"` | Hits compilation-year facts common on reissues |
| Encyclopedia penalties | Hits metadata-heavy stories when research is thin |
| `missingAreas >= 4` → Needs More Research | Correlates with older catalog gaps, not flashiness |

Cash is underrated because **research never supplied heritage-grade facts**, not because the owned live video is less flashy.

---

## Patron Value score math (Cash ≈ 5.5)

Starting base **4.0**, approximate ledger:

| Adjustment | Amount | Reason |
|------------|--------|--------|
| Hook length | +0.5 | ~38 chars |
| Encyclopedia hook | **−1.5** | `"was released in"` |
| Paragraph structure | +1.5 | 4 paragraphs |
| Body length | 0 | 212 chars — no bonus, no short penalty |
| Encyclopedia body | ~−0.6 | album/release repetition |
| Unique sentence ratio | **−1.0** | repeated 1969/album lines |
| Facts ≥ 4 | +0.75 | 5 accepted (inflated by duplicates) |
| Cultural fact bonus | 0 | no qualifying facts |
| Story seed alignment | +0.25 | summary echoes seed |

**≈ 5.5** — matches stored `editorialReview.patronValue`.

Danzig (8.0) with similar 212-char body avoids the `"was released in"` hook penalty and leads with chart facts. Soho (9.0) adds +0.5 facts≥7 and +0.5 length≥400.

---

## Recommendations (scoring / rules — no Johnny Cash hardcoding)

### Collector / graph (highest leverage)

1. **Distinguish original release vs compilation reissue** when deriving `identity.year` and recording facts. Do not promote compilation year as `"was released in"` for canonical heritage singles.
2. **Backfill chart history** for pre-Hot-100-era and classic country — even peak position + weeks unlocks hook templates that score well today.
3. **Run cultural/research enrichment** when `culture` or `charts` confidence < 40 and `missingAreas >= 3` — before Editor distill.
4. **Dedupe accepted facts** at promotion time (three identical album lines should be one).

### Editor / rewrite

5. When **story angle = live_performance** and performance has `detectedVenue` / `detectedYear`, require hook to lead with **place + moment**, not album metadata.
6. If graph release year and performance year diverge by >5 years, flag **fact conflict** for Editor (don't silently pick compilation year).

### Patron Value algorithm (`editorial-review.ts`)

7. **Split scores:** keep Patron Value for *narrative quality*; add separate **Research Coverage** score that drives `needs_more_research` — avoid double-penalizing Editor for Collector gaps.
8. **Heritage floor (generic):** when `performanceQuality >= 9` AND performance `detectedYear < 1970` AND `identity` confidence = 100, apply a small **historical anchor bonus** (+0.5–1.0) if live venue/year facts exist — rewards owned archival footage without naming artists.
9. **Count distinct facts** for fact bonuses (hash normalized text), not raw accepted count.
10. **Soften `"was released in"` hook penalty** when no chart/cultural facts exist — or replace with positive scoring for chart peaks / Grammy / Hall of Fame patterns in facts.
11. **Feed performance narrative into Patron Value:** e.g. bonus when `buildPerformanceRationale` mentions venue + year and angle is live — currently performance quality is computed but ignored by Patron Value.

### Editorial review gate

12. Change `researchThin` trigger: `missingAreas >= 4` alone should not block **Ready for Director** if Patron Value ≥ 7 and performance/visual ≥ 8 — instead recommend **Collector re-run** while allowing Director for presentation prototype.

---

## Verdict

| Suspected cause | Verdict |
|-----------------|---------|
| Missing research | **Yes — main driver** |
| Weak accepted facts | **Yes — wrong year, duplicates, no culture** |
| Poor story angle | **Partial — live angle chosen but seed/facts stay on 1969 comp** |
| Rewrite quality | **Symptom of thin inputs, not primary bug** |
| Performance metadata | **No — scores 10/10** |
| Visual weighting | **No — scores 8.5/10** |
| Video-era algorithm bias | **Indirect only — length/fact/chart dependencies favor wiki-rich modern tracks** |

**Fix order:** graph release-year resolution → chart/cultural enrichment → dedupe facts → Patron Value decouple from research gaps → live-performance hook rules.
