# Phase 1.1 — Studio Operator Experience

**Goal:** Every Studio screen explains itself. No external docs required when Operator Guide is on.

---

## Operator Guide Toggle

Click **? Operator Guide** on any Studio or Mission Control page.

- Persists in `localStorage` (`retroverse-studio-operator-guide`)
- Turns on Levels 2–4 (annotated cards, context panels, tooltip hints)

---

## Help Levels

| Level | What | Where |
|-------|------|--------|
| 1 | Metric tooltips (hover / ⓘ when guide on) | Mission Control stats, Production Health |
| 2 | Annotated card panels | Mission Control, Queue, Health, Daily Report |
| 3 | About This Page (collapsible) | All Studio pages + Mission Control |
| 4 | Guided tour | **Guided tour** button per page |

---

## Glossary

Canonical terms: `lib/ops/studio/operator-guide/glossary.ts`

RVTR, Collector, Editor, Director, Patron Value, Confidence, Render Ready, etc.

---

## Pages covered

- `/ops/studio` — Dashboard
- `/ops/browser-plus-2` — Mission Control
- `/ops/studio/collector|editor|director|publisher`

---

## Checkpoint

1. Open Mission Control
2. Enable Operator Guide
3. Expand **About This Page**
4. Click **Guided tour**
5. Hover Production Health metrics — see ⓘ hints

Execution State: **COMPLETE** when an unfamiliar operator can answer what/why/next without leaving the app.
