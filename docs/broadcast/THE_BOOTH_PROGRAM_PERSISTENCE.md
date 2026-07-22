# The Booth — Program Persistence & Restart Behavior

**Authority:** Presentation `playhead` + published Snapshot queue (`PresentationState` / `broadcast.json`).  
The Booth Store is a client mirror and Air-ownership operator — not a second Program index.

## Existing persistence (no new store)

| Artifact | Role |
|---|---|
| Presentations file (published queue) | Ordered RVBAs / Snapshot items |
| `PresentationState.state.json` | `activePresentationId`, `playhead` (anchor, mode, startedAt), `boothPublisher`, `lastBoothPublishedKey` |
| `broadcast.json` | Last synced public Snapshot (queue + playhead + boothPublisher overlay) |

Booth UI state (`BoothState`) lives in the browser only until a successful Load / transport / publish round-trip mirrors it.

---

## What happens when…

### The Booth page refreshes

- Client Booth Store resets to READY (empty mirrors).
- Presentation playhead on disk is unchanged.
- Operator must **Load Show** again to re-mirror Current / Next / Upcoming from the authoritative playhead (LOAD does not publish).
- If a Booth session was mid-show (`boothPublisher.sessionActive`), public Snapshot may still show the last published ownership until the next intentional publish / End Show / Load clears the session.

### Studio restarts

- Presentation state + broadcast snapshot on disk remain.
- Public site keeps last successful push until Studio syncs again.
- Booth UI starts fresh; Load Show re-attaches to the active published presentation without inventing a new index.

### The loaded Snapshot changes

- Authoritative queue is the presentation’s **published** copy.
- Re-publish / switch active presentation updates what Load Show and transport resolve.
- If the active playhead anchor id disappears from the new queue, Program view marks `currentAvailable: false` — no fabricated item, no silent first-result fallback.

### An RVBA disappears

- Item disabled / missing / empty title → invalid.
- View: `currentAvailable: false`, `currentAsset: null` (no fabricate).
- Public playhead keeps the last valid published asset until the operator makes a valid NEXT / PREVIOUS / JUMP / RETURN / GO LIVE.
- Transport may move to another valid item; JUMP requires an exact enabled id.

### The public publisher is temporarily unavailable

- Local `broadcast.json` / presentation state still update when Studio can write.
- Push returns non-`synced`; Booth surfaces Fault / Unconfirmed via publish result.
- Idempotent key (`lastBoothPublishedKey`) prevents duplicate pushes of the same air identity when the publisher recovers and the operator does not change ownership.

---

## Publication safety

- Publish only on intentional ownership or Program transport transitions (GO LIVE, NEXT/PREV/JUMP while Program owns air, TAKE interrupt, RETURN, End Show as designed).
- LOAD SHOW never publishes.
- NEXT while an interrupt owns The Air updates the frozen Program playhead only — no publish.
- Duplicate air keys are skipped (`lastBoothPublishedKey` / `skippedDuplicate`).
