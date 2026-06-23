# Record Label Renderer — Roadmap

## Current State

- `components/ops/intelligence/artifacts/RecordLabelCard.tsx` — palette switch for 11 label keys
- `lib/ops/intelligence/package-intel.ts` — `LABEL_RE` extracts label from research vault excerpts
- Fallback: **Retroverse Reconstruction** (teal/orange RV palette)

## Supported Renderers

| Label | Detection | Palette |
| --- | --- | --- |
| Warner Bros. | `/warner\s*bros/i` | Black / gold / blue |
| Columbia | `/columbia/i` | Silver / red mark |
| Capitol | `/capitol/i` | Orange wedge |
| Atlantic | `/atlantic/i` | Navy / blue |
| Motown | `/motown|tamla/i` | Purple / gold |
| RCA | `/rca/i` | Red ring |
| MCA | `/mca/i` | Green |
| Epic | `/epic/i` | Yellow |
| Arista | `/arista/i` | Gold / brown |
| Chrysalis | `/chrysalis/i` | Green butterfly tone |
| Retroverse Reconstruction | no match | Teal / orange |

## Gap (from validation batch)

**67% label metadata extraction** — renderer works; `intel.label` often null.

## Phase A — Extraction (priority)

1. Expand `LABEL_RE` in `package-intel.ts` (done for major labels)
2. Add pattern extract in `pattern-extract.ts` for `"released on X Records"` phrases
3. Fall back to album-era heuristic: decade + genre → likely label family (low confidence)
4. Always set `intel.catalogNumber` from RVTR/year/album when label missing (already partial)

## Phase B — Renderer polish

1. Split renderers into `components/ops/intelligence/artifacts/labels/*.tsx`
2. Label-specific logo geometry (Capitol tower, Motown map pin, etc.)
3. Song sheet + artifact studio share same `RecordLabelCard` wrapper

## Phase C — Scale

1. Label frequency report from backfill queue
2. Auto-prioritize top 20 labels by library count
3. Custom palettes for indie labels with >50 songs

## Success Metric

Full artifact readiness `record_label: true` ≥ **90%** on VDJ validation batch (currently ~67% metadata, 100% visual via fallback).
