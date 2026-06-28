# Chart Journey v1 — Design Document

**Experience:** 1.0 — Flagship Retroverse Experience  
**Date:** 2026-06-28  
**Status:** Design workspace — not published to patrons  
**Design workspace:** `/ops/studio/experiences/chart-journey`

---

## Vision

The Chart Journey is the definitive Retroverse answer to: **How did this song become a hit?**

Not statistics. Not a database report. A **living documentary** — ESPN timeline energy, Apple launch pacing, Formula One recap momentum, Ken Burns warmth, museum installation permanence.

Every song with chart history should inherit this experience.

---

## Story Structure

Chapters are **optional and data-driven**. Missing data skips the chapter — the journey adapts to what the song actually did.

| Chapter | Question answered | Included when |
|---|---|---|
| **Opening** | What is this hit? | Always (chart data exists) |
| **Release** | Where did it begin? | Release year, album, or debut date |
| **Entered Charts** | When did the world notice? | Any trajectory weeks |
| **Rapid Rise** | How fast did it climb? | Significant climb, short time-to-peak, or rocket archetype |
| **Peak Week** | What was the summit? | Peak position known |
| **Competition** | Who blocked #1? | *Future — chart-week graph* |
| **Longevity** | How long did it stay? | ≥ 8 weeks or re-entry |
| **International** | Where else did it win? | ≥ 2 regions in collector facts |
| **Awards** | Gold / Platinum / Grammy? | Certification hints in facts |
| **Legacy** | Does it still live? | Cultural threads or long chart run |

### RVTR001341 (Dr. Hook, 1978)

**Active chapters (8):** Opening → Release → Entered Charts → Rapid Rise → Peak Week → Longevity → International → Legacy

**Skipped:** Competition (no chart-week graph), Awards (Gold on album, not surfaced as track cert yet)

**Creative Review:** 92/100 — *Signature experience — ready for patron preview*

---

## Visual Language

**Signature:** *The Retroverse Chart Journey — animated climb, peak celebration, living timeline*

| Dimension | Choice |
|---|---|
| **Palette** | Teal `#1a7a7a` · Orange `#e85d04` · Cream paper `#f7f2e8` · Ink `#1a1a1a` · Gold `#ffd166` · Chart red `#8b0000` |
| **Display type** | Cooper Black / chart headline — poster authority |
| **Stat type** | Tabular bold sans — ESPN stat wall |
| **Body type** | Georgia editorial — Ken Burns documentary |
| **Texture** | Newsprint grain · Billboard ink · vinyl gloss · museum panel matte |

Distinct from Song DNA (lab cyan), Performance Universe (stage spotlight), and generic museum panels.

---

## Motion Language

| Beat | Motion | Feel |
|---|---|---|
| Opening | `vinyl_spin` | Record comes alive |
| Release | `magazine_reveal` | Sleeve slides into frame |
| Entered Charts | `fade_up` | First footprint appears |
| Rapid Rise | `line_draw` | SVG path draws week by week |
| Peak Week | `confetti_pulse` | Celebration — this mattered |
| Competition | `cover_slide` | Rivals move across the wall |
| Longevity | `calendar_flip` | Weeks accumulate |
| International | `map_illuminate` | Countries glow in sequence |
| Awards | `milestone_pulse` | Plaques land with weight |
| Legacy | `timeline_scroll` | Story continues beyond the chart |

All motion respects `prefers-reduced-motion`.

---

## Module Architecture

**Scope:** Experience layer only — no Studio pipeline changes.

```
lib/experiences/chart-journey/
  types.ts              — chapter + review types
  enrichment.ts         — international / awards / legacy from collector facts (read-only)
  build-chapters.ts     — data-driven chapter assembly
  build-experience.ts   — full experience + workspace loader
  creative-review.ts    — 7-dimension review scoring

components/experiences/chart-journey/
  ChartJourneyWorkspace.tsx
  ChapterBeatPreview.tsx
  ChartJourneyLineViz.tsx
  ChartJourneyCreativeReviewPanel.tsx
  chart-journey-flagship.css

app/ops/studio/experiences/chart-journey/
  page.tsx              — showcase landing
  [rvtr]/page.tsx       — per-song design workspace
```

**Reuses (unchanged):**
- `buildChartJourney()` — trajectory model
- `detectChartArchetype()` — narrative classification
- `loadTrackPage()` — Hot 100 weeks
- `loadCollectorPackage()` — enrichment hints only

---

## Fallback Behavior

| Situation | Behavior |
|---|---|
| No Hot 100 weeks | Workspace shows “no chart trajectory” message |
| Missing peak | Peak Week chapter skipped |
| Short chart run (< 8 weeks, no re-entry) | Longevity skipped |
| No international facts | International skipped |
| No cert/award facts | Awards skipped |
| No chart-week graph | Competition skipped (documented future) |
| No legacy/cultural threads | Legacy skipped unless weeks ≥ 20 |

The experience **never fabricates** chart data. Wonder comes from real trajectory shape.

---

## Creative Review Dimensions

Evaluated in the design workspace (not Studio Creative Review department):

| Dimension | What it measures |
|---|---|
| Narrative excitement | Rise → peak arc, archetype drama |
| Visual excitement | Chapter count, motion variety |
| Historical clarity | Peak, weeks, debut context |
| Momentum | Climb pacing, chapter flow |
| Ending | Legacy / longevity closure |
| Educational value | Teaches chart mechanics through story |
| Replay value | Expandable weeks, future competition hook |

---

## Future Enhancements

### Near term (Chart Journey v1.1)

1. **Competition chapter** — wire `ChartWeekContextHooks` (numberOne, neighbors, movers)
2. **Awards chapter** — structured RIAA / Grammy entities from Collector
3. **Animated week expansion** — tap/hover reveals week detail panel in Rapid Rise
4. **Patron route** — `/experience/[rvtr]/chart-journey` when ready (not in v1)

### Medium term

5. **International map** — SVG world map with real chart positions per country
6. **Peak Week variants** — #1 confetti vs Top 10 magazine vs deep-cut documentary
7. **Billboard 200 album journeys** — `maxRank: 200` album fingerprint mode
8. **Chart date portal integration** — every point links to `/week/{date}`

### Long term

9. **Auto-inherit** — any song with `trajectoryWeeks.length > 0` gets Chart Journey chapter in patron experience
10. **Artist Universe bridge** — Legacy chapter links to RVAR graph
11. **Replay mode** — scrub through weeks with audio snippet hooks

---

## Showcase Songs

| RVTR | Song | Why |
|---|---|---|
| RVTR001341 | Dr. Hook — When You're In Love With A Beautiful Woman | Studio verification song · international · 25 weeks |
| RVTR044043 | Blondie — Heart Of Glass | Rocket archetype |
| RVTR023559 | Fleetwood Mac — Dreams | Long runner |
| RVTR891825 | Don McLean — American Pie | Epic chart shape |

Open: `/ops/studio/experiences/chart-journey/{RVTR}`

---

## Success Criteria

| Criterion | Status |
|---|---|
| Design workspace exists | ✓ `/ops/studio/experiences/chart-journey` |
| Not published to patrons | ✓ Ops-only workspace |
| Data-driven optional chapters | ✓ 10 chapter types, skip when no data |
| Distinct visual language | ✓ Teal/orange/cream flagship palette |
| Motion on key beats | ✓ vinyl, line draw, confetti, map glow |
| Creative Review panel | ✓ 7 dimensions |
| Studio pipeline untouched | ✓ No Collector/Editor/Director/Publisher changes |
| RVTR001341 verification | ✓ 8 chapters, review 92/100 |
| Typecheck | ✓ pass |

**Optimize for wonder — not efficiency.**

**Execution State: COMPLETE**
