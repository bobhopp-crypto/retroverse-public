# BobOS Panel Documentation Standard

## Ownership

| Layer | RV ID | Role |
|-------|-------|------|
| **Platform documentation library** | **RV 00-00** | Owns the indexed library of panel manuals (`/bobos/docs`) |
| **Cockpit** | **RV 01-01** | Presents and navigates the library; panel faceplates expose stamps |
| **Individual panels** | e.g. RV 02-04 | Each card can open its own manual |

Cold-start of the platform remains `tools/mac/RETROVERSE.command`. The browser-facing documentation root for RV 00-00 is `/bobos/docs`.

## Single source of truth

All views read the same typed records:

- Schema: `lib/bobos/cockpit/panel-docs/types.ts` → `PanelDocumentation`
- Manuals registry: `lib/bobos/cockpit/panel-docs/registry.ts`
- Index builder: `lib/bobos/cockpit/panel-docs/catalog.ts` (indexes only — does not duplicate content)
- Verification helper: `lib/bobos/cockpit/panel-verification.ts`

Do **not** maintain separate markdown copies per panel unless generated from this registry.

Shared UI:

- `PanelDocumentationView` — operator-manual body
- `PanelDocumentationDrawer` — Cockpit side sheet (wider readable drawer)
- `PanelDocumentationIndex` — RV00-00 library index

## Two independent signals

| Signal | Question | UI |
|--------|----------|----|
| **Health** | Is it running? | Existing status lamp (unchanged) |
| **Verification** | Has Bob personally confirmed that it works? | `VERIFIED` stamp on the faceplate |

## Required manual sections

1. Purpose  
2. User Workflow  
3. Operator Notes  
4. Technical Architecture  
5. Source Files  
6. Public Routes  
7. APIs  
8. Data Model  
9. Runtime Dependencies  
10. Verification  
11. Known Limitations  
12. Future Enhancements  
13. Change History  

Tone: **operator manual**, not developer README.

## How to document a new panel

1. Create `lib/bobos/cockpit/panel-docs/panels/<panel-type>.ts` exporting a `PanelDocumentation` object.
2. Register it in `panel-docs/registry.ts`.
3. Set `verification.status` to `"verified"` only after Bob confirms.
4. The index, drawer, stamp, and full-page manual pick it up automatically.

## Access

- Cockpit header: **Documentation** (RV00-00)
- Command bar: **Documentation** → `/bobos/docs`
- Full manual: `/bobos/docs/<RV-ID>` (e.g. `/bobos/docs/RV02-04`)
- Faceplate `VERIFIED` stamp → drawer → optional **Open Manual**

## First implementation / RV02 Pass System

| Panel | RV ID | Status |
|-------|-------|--------|
| Event Hub (Current Event) | RV 02-01 | Verified + fully documented |
| Event Producer | RV 02-02 | Verified + fully documented |
| Design Builder (Pass Production) | RV 02-03 | Verified + fully documented |
| Pass Registration | RV 02-04 | Verified + fully documented |
| Pass Management | RV 02-05 | Verified + fully documented |

System closure: `docs/bobos/RV02_PASS_SYSTEM.md` + `lib/bobos/system-verification.ts` (`RV02-PASS-SYSTEM`).

Undocumented panel-eligible entries appear in the index as **Not documented**.
