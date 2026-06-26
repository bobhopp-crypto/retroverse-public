# Browser Plus 3.1 — Work Queue Conversion

**Date:** 2026-06-24  
**Route:** `/ops/browser-plus-2`

---

## Shipped

### Dashboard → work queues

| Queue | Definition |
|---|---|
| **Videos** | Active VIDEO library count |
| **Needs Identity** | No RVTR (blank / unparsed label) |
| **Needs Research** | RVTR · no research JSON |
| **Needs Review** | Research status = `review` |
| **Needs Cover** | RVTR · no Retroverse cover |
| **Experience Ready** | RVTR + research + Retroverse cover + story + renderable |

Queues overlap by design (e.g. Needs Research + Needs Cover).

### Removed from UI

Identified, Processed, Legacy, Recently Added, PK, DK, lifecycle status badges.

### Filters (sidebar)

Needs Identity, Needs Research, Needs Review, Needs Cover, Experience Ready, Top Played, All Videos.

### Research score (0–100)

| Bucket | Weight |
|---|---|
| Identity (RVTR) | 20 |
| Cover | 20 |
| Facts | 20 |
| Stories | 20 |
| Timeline / relationships | 20 |

Levels: Minimal · Basic · Good · Rich · Complete

### Inspector

Header: Artist, Title, Year, RVTR, scores, **work queue chips**.

**Work Queue panel** answers acceptance test:

1. Has identity?
2. Has research?
3. Needs review?
4. Has cover?
5. Experience ready?
6. Next automation

### Ollama automation

- **API:** `POST /api/ops/browser-plus-2/research-queue` (batch 5, `processSong` via existing execution runner)
- **UI:** “Queue Research Build (5)” when eligible and no active job
- Eligibility: RVTR + no research file

---

## Key files

- `lib/ops/browser-plus-2/work-queues.ts`
- `lib/ops/browser-plus-2/research-build-queue.ts`
- `app/api/ops/browser-plus-2/research-queue/route.ts`
- `components/ops/browser-plus-2/BrowserPlus2Client.tsx`

---

## Checkpoint

1. Dashboard shows 6 queue cards (not Identified/Processed)
2. Select song with RVTR, no package → chips: **Needs Research** + **Needs Cover**
3. Work Queue panel shows **Next automation: Queue Ollama research build**
4. Click **Queue Research Build** → job starts (requires Ollama + ops gate)
