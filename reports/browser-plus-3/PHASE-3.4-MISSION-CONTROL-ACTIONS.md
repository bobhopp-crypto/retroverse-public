# Browser Plus 3.4 — Mission Control Actions

**Date:** 2026-06-24  
**Route:** `/ops/browser-plus-2`

---

## Summary

Mission Control now converts readiness metrics into **one-click actions**. No new metrics. No schema changes.

---

## Phase 1 — Readiness Drilldowns

Each readiness card includes:

- **Blocking Issues** breakdown (exclusive waterfall)
- **Fix Remaining** / **Show Missing** button → filters browser to cohort + not Experience Ready

No Usable Cover card adds **Show Missing Covers** → `no-usable-cover` filter.

---

## Phase 2 — Next Action Buttons

Inspector shows **Next Action** + action button:

| Next Action | Button | Behavior |
|---|---|---|
| Assign RVTR | Open Matching | Classic Browser+ match workflow |
| Build Research | Queue Research | POST research-queue `{ rvtr, limit: 1 }` |
| Review Package | Open Song Research | `/ops/intelligence/package/{RVTR}` |
| Acquire Cover | Open Cover Tools | `/ops/review/covers` |
| Fix Renderability | Open Song Research | Same as review |
| Experience Ready | Open Song | Patron song page |

---

## Phase 3 — Review Next

**Needs Review** card → **Review Next**

Opens highest-priority review item (Sunday → Top 100 → Top 500 → Library), filters to Needs Review, selects row, opens Song Research.

---

## Phase 4 — Research Queue Actions

Tier buttons (1 song each, existing Ollama infrastructure):

- Process Next Sunday Song
- Process Next Top 100 Song
- Process Next Top 500 Song
- Process Next Library Song

API: `POST /api/ops/browser-plus-2/research-queue` with `{ tier, limit: 1 }`

---

## Phase 5 — Blocking Analysis

Each readiness panel shows non-zero blockers:

- Missing Research
- Needs Review
- Missing Cover
- Renderability

Computed server-side in `cohorts.ts` → `classifyReadinessBlocker()`.

---

## Phase 6 — Path To Ready

Inspector panel **Path To Ready**:

- RVTR Assigned
- Cover Present
- Research Built
- Story Present
- Review Pending / Approved
- Renderable

**Next Step** matches `nextAction` with action button.

---

## Files

| File | Role |
|---|---|
| `lib/ops/browser-plus-2/mission-actions.ts` | Client action helpers + URLs |
| `lib/ops/browser-plus-2/readiness.ts` | Blockers + path to ready |
| `lib/ops/browser-plus-2/cohorts.ts` | Panel blockers |
| `lib/ops/browser-plus-2/research-build-queue.ts` | Tier + RVTR queue options |
| `components/ops/browser-plus-2/BrowserPlus2Client.tsx` | Action UI |
| `app/api/ops/browser-plus-2/research-queue/route.ts` | Tier API |

---

## Acceptance

| Question | Answer |
|---|---|
| Am I ready for Sunday? | Readiness card 118/138 |
| What prevents readiness? | Blocking Issues on card |
| Which song to fix next? | Filter via Fix Remaining |
| Which song for Ollama? | Process Next {tier} Song |
| Which review next? | Review Next button |
| Path to Experience Ready? | Path To Ready panel |

---

*End of report.*
