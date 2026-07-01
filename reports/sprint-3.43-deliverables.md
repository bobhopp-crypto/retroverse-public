# Sprint 3.43 — Stabilize Mission Control and Deploy

Generated: 2026-06-28T22:42:00Z  
Commit: `27da3c3c3` (local main, not yet on origin)

## 1. What was fixed

### Sunday Night Progress (era counts all zero)

**Root cause:** `readCollectorYear()` in `load-mission-control-dashboard.ts` read only the first **768 bytes** of `collector.json`. Canonical `identity.year` lives at bytes **~1587–1965** (after the package-status block), so the regex never matched and every era bucket stayed at 0.

**Fix:** Read **2048 bytes** and match the canonical identity block:

```ts
/"identity"\s*:\s*\{\s*"rvtr"[\s\S]*?"year"\s*:\s*(\d{4})/
```

No hardcoded counts. Same full-disk scan + publisher store as the rest of Mission Control.

### Mission Control hang (from Sprint 3.42, included in this deploy commit)

- `LivingStudioHome.tsx` — client poll preserves `dashboard` in snapshot (no more infinite “Loading factory status…”).
- `LivingStudioHomeView.tsx` — removed non-resolving loading gate.

---

## 2. Final production counts (authoritative loader, snapshot at screenshot time)

Source: `loadMissionControlDashboard()` / `npm run research:studio:mission-control-audit`

| Metric | Count |
| --- | ---: |
| Collector | 5217 |
| Editor (complete) | 2962 |
| Director (complete) | 2959 |
| Creative Review (complete) | 2959 |
| Publisher (incl. pending) | 2959 |
| **Published** | **2957** |
| Remaining | 2260 |
| Failures | 3 |
| Stage reconciliation | needsEditor + needsDirector + needsCreativeReview + needsPublisher + published = **5217** ✓ |

*Counts drift while the backlog runner is active; all metrics share one loader.*

---

## 3. Sunday Night Progress (after fix)

| Era | Collector | Editor | Director | Published |
| --- | ---: | ---: | ---: | ---: |
| **1980s** | 788 | 511 | 511 | 510 |
| **1990s** | 649 | 421 | 421 | 420 |
| **2005s** | 763 | 336 | 336 | 336 |

---

## 4. Verification checklist

| Check | Result |
| --- | --- |
| `tsc --noEmit` | Pass |
| Mission Control warm load | **1.48s** (< 3s) |
| “Loading factory status…” | **0** occurrences after poll |
| All 4 sections render | Current Activity, Production Health, Sunday Night Progress, Recent Published |
| Console / CSS / JS | No missing assets on authenticated `/ops/studio` fetch |
| Single source of truth | `loadMissionControlDashboard()` |
| Backlog runner | Still running (unaffected by dashboard-only changes) |

Screenshot: `reports/sprint-3.43-mission-control-screenshot.png`  
Machine-readable: `reports/sprint-3.43-mission-control-verification.json`

---

## 5. Deployment

| Item | Status |
| --- | --- |
| **Target URL** | https://retroverse.live |
| **`git push origin main`** | **Blocked** — GitHub rejects 6 unpushed local commits: `.venv-allstar/.../libtorch_cpu.dylib` (237 MB) and other large files in history |
| **`vercel --prod`** | **Blocked** — “Request body too large. Limit: 10mb” (repo includes large local artifacts) |
| **Production today** | Still serving last deployed build on origin/main (`0121951cc`) |

### To deploy (Bob)

1. Remove `.venv-allstar/` and other large paths from git history on the 6 unpushed commits (or squash/rebase without those paths), **or** push only Mission Control files via a clean branch from `origin/main` that includes prerequisite Studio ops commits without venv artifacts.
2. Push to `main` (Vercel auto-deploy) **or** set `VERCEL_DEPLOY_HOOK_URL` and trigger production deploy.
3. Post-deploy smoke: `/ops/studio`, published experience, Chart Journey hash link, experience pages.

---

## Execution state: **WAITING**

Dashboard stabilization **complete** locally (commit `27da3c3c3`). Production deploy **blocked** on git/artifact size — needs one manual publish step above.
