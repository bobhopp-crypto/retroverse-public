# Package Completion Audit

**Scanned:** 2026-06-24T02:53:44.981Z
**Focus:** 789 owned-cohort packages in `review` with **zero story cards**

---

## Why they stopped at `review`

`processSong()` **intentionally ends at `review`** without building cards:

> "Ready for human review — build cards after approving facts/stories"

Card assembly is a **separate step** (`buildCardsFromReview` / `finalizeAndPublish`). The overnight backfill also **skips** packages already in `review` on resume — so most never received card assembly.

---

## Failure / stall categories (789 packages)

| Category | Count | % |
|----------|------:|--:|
| Ready — card assembly only (canBuildCards passes) | 783 | 99.2% |
| Insufficient approved facts (< 3) | 6 | 0.8% |

---

## Effort tiers to reach `cards_ready`

| Tier | Count | Effort | Action |
|------|------:|--------|--------|
| **1 — Card assembly only** | 783 | ~1–2 sec/pkg, no Ollama, run buildCardsFromReview batch | `buildCardsFromReview` batch |
| **2 — Story approval gap** | 0 | ~5 min/pkg or batch rule change — lower rankScore threshold / manual approve | Lower auto-approve threshold or batch-approve top stories |
| **3 — Fact gap** | 6 | ~30–90 sec/pkg Ollama re-extract or fact approval pass | Promote facts or re-run extraction |
| **4 — Draft (failed process)** | 108 | ~45–120 sec/pkg full processSong retry | Re-run `processSong` |
| **5 — Empty / broken** | 0 | ~45–120 sec/pkg full pipeline re-run | Full pipeline re-run |

---

## Fastest path: 1,184 package files → intelligence packages

| Current state | Count |
|---------------|------:|
| Already intelligence (`cards_ready` / `published` / has cards) | 287 |
| `review` + ready for card assembly | 783 |
| `review` + needs story/fact fix (Tier 2–3) | 6 |
| `draft` (process failed) | 108 |

**After Tier-1 card assembly only:** 1,070 intelligence packages (+783 from current 287)

No new Ollama generation required for Tier 1.

---

## Recommended sequence (no new songs)

1. **Batch `buildCardsFromReview`** on 783 ready packages (~26 min)
2. **Batch story auto-approve** rule relaxation for Tier 2 (0 pkgs)
3. **Fact promotion pass** on Tier 3 before card assembly
4. **Re-process** 108 drafts only (not the 789 review cohort)
5. Leave Tier 5 for manual triage

---

## Outputs

- `completion-audit.json`
- `review-no-cards.csv`
