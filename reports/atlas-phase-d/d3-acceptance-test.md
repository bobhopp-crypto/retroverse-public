# D3 Curator Acceptance Test

**Date:** 2026-06-16  
**Runner:** `RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npx tsx tools/atlas-mission-acceptance-test.ts`  
**Raw JSON:** `reports/atlas-phase-d/d3-acceptance-test.json`

---

## Verdict

| Area | Result | Notes |
|------|--------|-------|
| Rhiannon full completion | **BLOCKED** | Album approve fails — duplicate RVTR on tracklist slot |
| Commentary / TV / Movie writes | **PASS** | Persisted; seals + gaps updated |
| Exhibit depth | **PARTIAL** | 25% → 50% (+25) after commentary; stalled without album |
| Territory impact | **UNCHANGED** | 65% → 65.5% projected (needs 75%+ depth for +1 mapped) |
| Mission queue | **PASS** | Next = Night Moves `RVTR347287` (rank #2) |
| Related Fleetwood Mac cards | **PASS** | Dreams, Go Your Own Way, Over My Head all load mission workflow |
| Evidence model stress (1970s) | **9/9 PASS** | Alternate titles, live paths, duets, one-hit, poor VDJ |

**Do not build new mission types until album duplicate-RVTR path is resolved.**

---

## 1. Rhiannon end-to-end (`RVTR097615`)

### Initial state (after partial prior run)
- Exhibit depth: **50%** (FORTIFIED)
- Open gaps: **album** only
- Seals: rvtr, identity, chart, commentary, tv, movie
- Top album evidence: **Fleetwood Mac (1975)** — 100% high, 8 signals
- Queue next: **Bob Seger — Night Moves** `RVTR347287`

### Write attempts

| Step | HTTP | Result |
|------|------|--------|
| Album approve (Fleetwood Mac 1975) | 409 | `slot_occupied` — tracklist keyed to **RVTR215144** |
| Commentary approve | 200 | OK (prior run) |
| TV confirm | — | Pre-resolved (tv seal present) |
| Movie reject | 200 | OK (prior run) |

### Bugs found + fixed during test
1. **`albumId` string from Postgres** — API rejected valid payloads (`400 albumId required`). Fixed: coerce `Number(albumId)` in route + loader.

### Blocker (not fixed — requires product decision)
**High-confidence album evidence is not writable** when the tracklist slot belongs to a sibling RVTR fragment.

- Evidence correctly shows: *Slot linked to another RVTR · RVTR215144*
- Approve still offered at 100% high tier
- Write guardrail correctly rejects (`slot_occupied`)

**Required before Rhiannon can complete:** merge/relink flow for duplicate RVTR identities, or auto-suggest the next **writable** candidate (e.g. unlinked compilation slot at 80% — not ideal canonically).

### Exhibit depth
| Milestone | Depth | Trigger |
|-----------|-------|---------|
| Start (fresh) | 25% | chart only |
| After commentary | 50% | +commentary score |
| After album (expected) | ~62–75% | +album link + cover |
| Complete | 75%+ | all actionable gaps closed |

**Observed:** +25 from commentary. Album gap blocks further depth gain.

### Territory impact
- `territoryMappedPct`: **65%** (static audit summary)
- `territoryMappedAfterPct`: **65.5%** at 50% depth (formula: small lift until 75%+ depth)
- Will not show meaningful territory movement until album closes and depth crosses 75%

### Queue
- `next.rvtr` = `RVTR347287` (Night Moves) — stable before/after
- Queue does not auto-advance on partial completion (expected — curator navigates via header link)

---

## 2. Related Fleetwood Mac cards

All open the same `/ops/atlas/mission/[rvtr]` workflow:

| RVTR | Title | Gaps |
|------|-------|------|
| RVTR569927 | Dreams | commentary, tv, movie |
| RVTR374298 | Go Your Own Way | commentary, tv, movie |
| RVTR377579 | Over My Head | commentary, tv, movie |

Album gap absent on these — already linked in graph (`albumScore ≥ 0.75`).

---

## 3. Stress test — evidence model vs bad data

1970s territory tracks only. Goal: **review evidence, not trust guesses**.

| Category | RVTR | Track | Top album | Conf | Tier | Verdict |
|----------|------|-------|-----------|------|------|---------|
| Alternate title | RVTR097615 | Rhiannon → canonical *Will You Ever Win* | Fleetwood Mac (1975) | 100 | high | PASS — tracklist token match |
| Live version | RVTR300772 | Dream On (Live path) | Aerosmith (1973) | 100 | high | PASS — 8 signals |
| Live version | RVTR003583 | Can't Get Enough (Live 2008) | 10 From 6 (1986) | 100 | high | PASS |
| Duet / with | RVTR008301 | A Horse With No Name | America (1972) | 100 | high | PASS |
| Duet / with | RVTR121636 | Make It with You | On The Waters (1970) | 100 | high | PASS |
| One-hit wonder | RVTR165042 | S.O.S. | ABBA compilation | 75 | **medium** | PASS — Review tier, not blind approve |
| One-hit wonder | RVTR020280 | Ring My Bell | Songs Of Love (1979) | 100 | high | PASS — tracklist match |
| Poor VDJ metadata | RVTR499866 | I'm Not In Love (0 plays, no tags) | Original Soundtrack (1975) | 100 | high | PASS — graph evidence carries |
| Poor VDJ metadata | RVTR915536 | Fernando (0 plays, no tags) | Greatest Hits (1976) | 100 | high | PASS |

**Stress summary:** 9 pass · 0 warn · 0 fail

### Notable behaviors
- **S.O.S.** — canonical title drift (`S O S`), compilation at **75% medium** → "Review & approve" not "Approve". Correct.
- **Live files** — path in evidence; album match still from tracklist/graph, not filename alone.
- **Zero-play / zero-tag tracks** — commentary evidence falls back to Hot 100 + era signals; album from tracklist.

### No pure "featuring" tracks in 1970s audit
Tested duet/path `"with "` patterns instead. No `feat.`/`featuring` strings in this territory export.

---

## 4. Recommended fixes (gate for new mission types)

1. **Duplicate RVTR album path** — When top candidate is `slot_occupied`, downgrade to medium/research, surface merge CTA, or offer next writable slot with evidence comparison.
2. **Pre-flight write check in UI** — Disable "Approve" when guardrails will fail; show guardrail message in evidence panel.
3. **Album gap vs graph state** — Tracks with existing `canonical_album_tracks` rows but low `albumScore` in live loader (e.g. S.O.S.) should not show album gap.

---

## 5. Re-run

```bash
RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npm run dev
RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npx tsx tools/atlas-mission-acceptance-test.ts
```

Checkpoint: JSON written to `reports/atlas-phase-d/d3-acceptance-test.json`
