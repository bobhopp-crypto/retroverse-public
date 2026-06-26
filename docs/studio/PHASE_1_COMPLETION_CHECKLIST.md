# Phase 1 — Studio Operational Readiness Checklist

**Goal:** Launch Browser+ and answer operational questions in under one minute.  
**Updated:** 2026-06-26

---

## One-Minute Morning Check (Browser+ 2)

Open `/ops/browser-plus-2` with `RETROVERSE_OPS=1`.

| Question | Where to look |
|----------|----------------|
| Is Studio healthy? | Mission Control lamp + **Production Health** grid |
| What ran overnight? | **Daily Production Report** → What ran overnight |
| What failed? | Mission Control **Failed (24h)** + Daily Report → Failures |
| What needs attention? | **Needs Attention** list + Production Health → Needs Attention |
| How many songs are production-ready? | Daily Report → Production-ready songs; Health → Render Ready |
| What should I work on next? | Library inspector **Next Action**; queue cards; batch bar |

---

## Deliverables Status

| # | Deliverable | Status | Notes |
|---|-------------|--------|-------|
| 1 | Operational Mission Control | **Done** | Stats refocused: Waiting / Running / Completed / Blocked / Failed |
| 2 | Verified queue | **Done** | JSON persistence; running jobs recover on restart |
| 3 | Production health dashboard | **Done** | Collector/Editor/Director coverage, render ready, patron/confidence |
| 4 | Overnight workflow | **Done** | Top 100, Top 500 cohort, Entire Library presets + runtime estimate |
| 5 | Package integrity report | **Done** | Scans research-department; shown in Daily Report |
| 6 | Daily production reports | **Done** | Auto-generated on each model load |
| 7 | Browser+ usability | **Done** | Trimmed duplicate header nav (shell owns product nav) |
| 8 | Stability | **Partial** | Queue recovery added; full stress test requires operator runtime |

---

## Queue Verification (operator)

Run manually with ops enabled:

- [ ] Enqueue 3 songs → pause → resume → completes
- [ ] Cancel active job → status failed / cancelled
- [ ] Fail a job → retry failed RVTRs only
- [ ] Queue Top 100 overnight preset → verify estimate + job in queue
- [ ] Restart dev server mid-job → job returns to queued and resumes

Queue file: `{retroverse-data}/ops/browser-plus/studio-queue.json`

---

## Package Integrity (operator)

Daily Report shows:

- Complete packages (Collector + Editor + Director + Render Spec)
- Missing artifact counts
- Outdated version drift (collector v4, editor v2, render spec v0.3)

Full RVTR lists truncated to 100 in API model — use integrity totals for scale.

---

## Explicitly Out of Scope (Phase 1)

- Publisher implementation
- Renderer implementation
- Department redesign
- New product features

---

## Phase 2 Gate

Phase 1 is complete when the one-minute morning check passes **three consecutive days** with real overnight runs and no manual queue cleanup.

**Next:** First complete Retroverse patron experience.
