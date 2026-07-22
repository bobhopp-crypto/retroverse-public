# RV02 — Pass System

| Field | Value |
|-------|--------|
| **Status** | **NOT VERIFIED** |
| **Last repair** | 2026-07-21 |
| **Repository** | RETROVERSE_PUBLIC |
| **Owner** | BobOS |
| **System ID** | `RV02-PASS-SYSTEM` |

## Contains

- Event Hub (RV02-01) — lightweight launcher
- Event Producer (RV02-02)
- Design Builder (RV02-03) — **not verified** (needs full generate + print package)
- Pass Management (RV02-05)

**Retired from RV02 panel set:** Pass Registration (RV02-04) — no longer a BobOS application. Public claim is RV05-05 (`/pass/[serial]`); operator work is RV02-05.

## Notes

RV02 was prematurely marked complete. Verification repair (2026-07-20) restored honest stamps:

- Design Builder panel VERIFIED removed until Bob generates and prints a complete production pass package.
- System VERIFIED removed until RV02-03 is honestly verified again.
- Event Hub classified as **lightweight launcher** (role B) — keep; do not redesign; do not retire.

Typed registry: `lib/bobos/system-verification.ts`  
Panel manuals: `lib/bobos/cockpit/panel-docs/panels/*` (RV00-00 library at `/bobos/docs`)

---

## Summary

RV02 Pass System is a BobOS subsystem: event context → production plan → pass artwork/serials → public QR claim → operator management on Neon.

Guests register at Live `/pass/[serial]` (RV05-05). Operators correct the same rows in BobOS Pass Management (RV02-05). Design Builder owns print inventory (`library.json`), not claims.

**Ownership:** Active Pass System pages, APIs, UI, and libraries live under `/bobos`, `/api/bobos`, `components/bobos`, and `lib/bobos`. Remaining `/ops` Pass URLs are compatibility redirects or re-exports only.

---

## Features

| RV ID | Name | Canonical route | Panel verification |
|-------|------|-----------------|--------------------|
| RV02-01 | Event Hub | `/bobos/event` | VERIFIED (launcher) |
| RV02-02 | Event Producer | `/bobos/producer` | VERIFIED |
| RV02-03 | Design Builder | `/bobos/passes` | **NOT VERIFIED** |
| RV02-05 | Pass Management | `/bobos/pass-management` | VERIFIED |

| Retired | Notes |
|---------|-------|
| RV02-04 Pass Registration | Retired 2026-07-21. `/bobos/pass-registration` → `/bobos/pass-management`. Public claim owned by RV05-05. |

### Canonical APIs

| API | Role |
|-----|------|
| `/api/bobos/pass-management` | Operator CRUD (RV02-05) |
| Live `/api/pass/claim` | Public claim / edit (RV05-05) |
| `/api/bobos/pass-registration` | Optional member/assign helper (no BobOS UI; legacy `/api/ops/pass-registration` re-exports) |

---

## Dependencies

- Studio ops gate (`shouldAllowOpsRoutes` / `isOpsEnabled`)
- Neon Postgres via `getPassPool()` (`RETROVERSE_PASS_PG_*` or production `RETROVERSE_PG_*`)
- Live app: `/pass/[serial]`, `POST|PATCH /api/pass/claim` (RV05-05)
- `lib/bobos/pass-studio` + Pass Studio `library.json` (issue path)
- Era Atlas canon (`data/rvbr/eras-canon.json`) via `listRvbrProfiles()` / `loadCanonRvbrProfiles()` — **not** a Postgres `rvbr_profiles` table
- Cockpit panel docs + verification stamps (RV00-00)

---

## Architecture notes

```
Event Hub (RV02-01) /bobos/event   [lightweight launcher]
    → Producer (RV02-02) /bobos/producer
    → Design Builder (RV02-03) /bobos/passes  [lib/bobos/pass-studio]
    → QR → Live /pass/[serial] (RV05-05)
    → Neon retroverse_passes + retroverse_visitors + activity
    → Pass Management (RV02-05) /bobos/pass-management  [/api/bobos/pass-management]
```

**Authoritative claim store:** Neon `retroverse_passes` / `retroverse_visitors` / `retroverse_pass_activity`  
**Not authoritative for claims:** `library.json`, `collector_pass_registrations` (retired)

---

## Legacy `/ops` compatibility (intentional)

| Legacy | Behavior |
|--------|----------|
| `/ops/pass-management` | → `/bobos/pass-management` |
| `/ops/pass-registrations` | → `/bobos/pass-management` |
| `/bobos/pass-registration` | → `/bobos/pass-management` (retired RV02-04) |
| `/bobos/docs/RV02-04` | → `/bobos/docs/RV02-05` |
| `/ops/passes` | → `/bobos/passes` |
| `/ops/event-studio/create/pass-generator` | → `/bobos/passes` |
| `/ops/event-studio/producer` | → `/bobos/producer` |
| `/api/ops/pass-management` | Re-exports `/api/bobos/pass-management` |
| `/api/ops/pass-registration` | Re-exports `/api/bobos/pass-registration` |

### Intentionally still under `/ops` (not Pass System ownership)

| Path | Why |
|------|-----|
| `/ops/event-studio/giveaway*` | Giveaway module (adjacent Event Studio; not RV02-01…05 Pass System) |
| `/ops/event-studio/homepage` | Homepage preview (adjacent) |
| `/ops/event-studio` (RV02-06) | Deprecated Legacy Event Tools hub |
| `/ops/content-creator` (RV02-16) | Content Creator — separate RV; Design Builder embeds VNext in-place |
| `lib/ops/event-studio/producer/*` + producer components | Shared draft store still used by BobOS Producer and Event Studio shell |
| `lib/ops/event-studio/production-binder` | Shared event binder for Event Hub / Producer |

---

## Verification checklist

| Check | Result |
|-------|--------|
| RV02-01 Event Hub loads as launcher | Pass |
| RV02-02 Event Producer loads | Pass |
| RV02-03 Design Builder loads (eras from canon) | Pass (runtime) — **panel NOT VERIFIED** pending print package |
| RV02-05 Pass Management against Neon | Pass |
| Public claim (RV05-05) / Live APIs | Pass (out of BobOS panel set) |
| System RV02-PASS-SYSTEM VERIFIED | **Fail** — blocked on RV02-03 |

---

## Known limitations

1. Issuing serials into `library.json` does not automatically insert Neon `retroverse_passes` rows.
2. Giveaway / homepage previews remain under `/ops/event-studio/*` (out of Pass System ownership).
3. Pass Management has no bulk export yet.
4. Producer draft store files still live under `lib/ops/event-studio/producer` (shared with Event Studio shell).
5. Create-orphan-visitor + assign-existing-visitor helpers are API-only (`/api/bobos/pass-registration`); not exposed in Pass Management UI.

---

## Remaining work

1. Complete Design Builder end-to-end: generate artwork, allocate serials, print a full production pass package.
2. Restore RV02-03 panel VERIFIED only after that success.
3. Restore system VERIFIED only after RV02-03 is honestly verified.

Event Studio integration remains outside RV02 scope.

---

## Change history

| Date | Summary |
|------|---------|
| 2026-07-21 | RV02-04 retired as BobOS application; public claim ownership clarified as RV05-05; operator surface is RV02-05 only |
| 2026-07-20 | Verification repair — system + Design Builder downgraded; `listRvbrProfiles` uses Era Atlas canon (fixes missing `rvbr_profiles` 500 on Design Builder); Event Hub role = lightweight launcher |
| 2026-07-20 | Final cleanup — Pass UI/lib/API under BobOS; `/ops` Pass paths redirects/re-exports only |
| 2026-07-20 | Premature system VERIFIED + panel manuals for RV02-01…05 (superseded by repair) |
| 2026-07-20 | Pass Management / Registration retargeted to Neon claim tables |
