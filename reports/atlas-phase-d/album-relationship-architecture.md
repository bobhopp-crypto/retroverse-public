# Album Relationship Architecture — Co-Album Membership

**Date:** 2026-06-16  
**Trigger:** Rhiannon (`RVTR097615`) — correct album Fleetwood Mac (1975) blocked by sibling RVTR on tracklist slot.

---

## Problem

`canonical_album_tracks` has **UNIQUE (album_id, position)**.  
Track #4 on Fleetwood Mac (1975) is keyed to `RVTR215144`.  
Mission RVTR `RVTR097615` is the same song (duplicate identity) but could not link without downgrading to a compilation slot.

---

## Solution

**`rvtr_album_memberships`** — RVTR joins a canonical album without owning a tracklist position.

| Mode | When | Write target |
|------|------|--------------|
| `tracklist_slot` | Slot empty or same RVTR | `canonical_album_tracks` |
| `co_album_membership` | Slot occupied by sibling RVTR, titles align | `rvtr_album_memberships` |

Schema: `tools/sql/rvtr_album_memberships_schema.sql`  
Logic: `lib/track/album-link-recovery/rvtr-album-membership.ts`

---

## Mission UX

- Album card shows **Tracks on this album** (slot RVTRs + co-album members)
- Evidence panel: **Co-album attach path** when joining sibling slot
- Primary action: **Attach to this album** (not downgrade to compilation)
- Exhibit depth recomputes from memberships + tracklist links

---

## Rhiannon success

| Before | After attach |
|--------|--------------|
| Album gap open, 409 `slot_occupied` | **200 OK** co-album membership |
| Exhibit depth 50% | **94% COMPLETE** |
| Fleetwood Mac (1975) blocked | Same canonical album preserved |

---

## Files

| File | Role |
|------|------|
| `rvtr-album-membership.ts` | Schema ensure, resolve mode, apply, load siblings |
| `validate-healing-apply.ts` | Routes tracklist vs co-album |
| `apply-album-link.ts` | Dispatches to correct writer |
| `mission-live-state.ts` | Stats + candidates include attachMode/siblings |
| `MissionAlbumSlot.tsx` | Siblings list + attach CTA |
| `mission-evidence.ts` | Co-album evidence signal |
