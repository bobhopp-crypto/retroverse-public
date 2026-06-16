# Atlas Phase D3 — Research Assistant Missions

**Date:** 2026-06-15  
**Goal:** Complete missions by approving Retroverse research — no outside knowledge required.

---

## Design shift

| Before (D2) | After (D3) |
|-------------|------------|
| Pick album from list | **Approve recommendation** (pre-ranked, highlighted) |
| Empty tag panels | **Pre-populated** Style, Crowd, Performance class |
| TV/Movie deferred chips | **Candidate matches** with Confirm / No appearance |
| "Link album" / "Save placard" | **Approve recommendation** / **Approve placard** |

Section renamed: **Review research**

---

## Per slot

### Album
- Candidates ranked by healing audit confidence
- Top match gets **Recommended** badge + research note
- Headline: `Retroverse recommends “Fleetwood Mac” (1975) — 87% confidence`
- One-click **Approve recommendation**

### Commentary
- Suggested Style tags from era + artist signals (+ VDJ User2 if present)
- Suggested Crowd tags from play count + chart peak
- Suggested Performance class from rotation signal
- Dashed outline on suggested tags; user edits before **Approve placard**

### TV / Movie
- Library scan for path/title matches (TV folders, movie/soundtrack paths)
- **Confirm match** or **No TV/movie appearance** (both resolve slot)
- Persisted in `ops/atlas-mission-appearances-by-rvtr.json`

---

## Rhiannon success test

User does not need to know Rhiannon's album (e.g. *Fleetwood Mac* self-titled 1975):

1. Open mission → see recommended album with confidence
2. **Approve recommendation**
3. Review pre-filled FolkRock + SingAlong + CrowdFavorite + Cocktail
4. **Approve placard**
5. Confirm or reject TV/movie matches
6. Stay on page · ~30 seconds

---

## New files

| File | Role |
|------|------|
| `lib/atlas/mission-research.ts` | Album + commentary suggestion engine |
| `lib/atlas/mission-media-research.ts` | TV/movie candidate search |
| `lib/atlas/mission-appearances-store.ts` | Confirm/reject persistence |
| `mission/MissionMediaSlot.tsx` | TV/movie approve UI |
| `app/api/ops/atlas/mission/[rvtr]/appearance/route.ts` | Appearance save API |

---

## Review

```bash
RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npm run dev
# /ops/atlas/mission/RVTR097615
```

---

## Bugfixes (500 → 200)

1. **`mission-media-research.ts`** — removed duplicate `AND` before `opsVideoMediaAndClause()` (clause already starts with `AND`).
2. **`mission-live-state.ts`** — import `normRvtrId` from `mission-safe` for TV/movie gap resolution.

Verified: `GET /ops/atlas/mission/RVTR097615` → **200**

---

## D3.1 — Evidence-first review (2026-06-15)

Shift from recommendations to **reviewing evidence**:

| Tier | Threshold | Primary action |
|------|-----------|----------------|
| High | >85% | **Approve** |
| Medium | 60–85% | **Review & approve** |
| Low | <60% | **Research needed** → Approve selection |

### Album quality fix (Rhiannon)
- Root cause: canonical title `Rhiannon Will You Ever Win` did not match tracklist slot `Rhiannon`
- Fix: `primaryTitleToken()` in tracklist fetch → Fleetwood Mac (1975) at **100%** with tracklist evidence
- Merge fix: tracklist rows win over bare `same_artist_album` stubs
- UI: **Why Retroverse thinks this** evidence panel per selected candidate

### Commentary
- Evidence signals: Hot 100 peak, library plays, era map, VDJ User2 (when present)
- Tags remain editable; approval gated by tier

### Shared pattern (TV model)
- All slots: candidate list → evidence panel → tier-gated approve
- New: `MissionResearchEvidence.tsx`, `mission-confidence.ts`, `mission-evidence.ts`
