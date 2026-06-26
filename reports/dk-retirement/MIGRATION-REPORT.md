# DK Retirement — Migration Report (Pre-Relabel)

**Generated:** 2026-06-24T16:30:48.194Z  
**Read-only inventory** — no label changes applied.

---

## VDJ label counts

| Scope | DK files | PK files | Bare RVTR | Blank | VIDEO DK | VIDEO PK |
|------:|---------:|---------:|----------:|------:|---------:|---------:|
| File rows | 1539 | 894 | 23341 | 5922 | 848 | 415 |

| Distinct RVTR | Count |
|---------------|------:|
| DK RVTR | 797 |
| PK RVTR | 465 |
| Bare RVTR only | 18440 |

---

## Deck-index vs DK label

| Signal | Count |
|--------|------:|
| `deck-index.json` entries | 833 |
| DK label but **not** in deck-index | 0 |
| In deck-index but **no** DK label | 36 |

Deck-index is a legacy workflow registry only — not a content artifact.

---

## Package / Song Experience renderability

Renderable = package status `published` or `review` (same gate as Song Experience).

| Cohort | Count |
|--------|------:|
| DK RVTR with renderable package | 797 |
| PK RVTR with renderable package | 167 |
| DK RVTR with **no** package file | 0 |
| PK RVTR with any package | 465 |
| Total packages on disk | 1351 |

**Rendering parity:** Songs with renderable packages should present identically regardless of DK vs PK label once runtime deck checks are removed.

---

## Functionality still tied to DK (pre-code-change)

| Area | Dependency | Post-retirement replacement |
|------|------------|----------------------------|
| Browser Plus `deckStatus` | `label.startsWith("DK_")` | Package renderability |
| Label write-back | `deck-index` → emit `DK_` | Always `PK_` when package exists |
| Video factory deck-worker | Promotes to deck-index | **Frozen** — no new index entries |
| Live queue filter | `hasDeck` = deck-index membership | `hasExperience` = renderable package |
| Live shell actions | "Deck" link to `/rvtr/.../deck` | Song Experience href |
| Automation factory metrics | `missingDeck`, deck-worker logs | Package renderability backlog |

---

## Relabel recommendation (do not execute yet)

After all runtime dependencies above are removed:

| Option | When to use |
|--------|-------------|
| **A. Leave DK untouched** | Short-term; labels become cosmetic only |
| **B. Convert DK → PK** | **Recommended** once code ignores prefix; 797 distinct RVTRs; package content unchanged |
| **C. Convert DK → bare RVTR** | Only if package absent; 0 DK RVTRs have no package |

**Recommended path:** **B** for RVTRs with packages (797 have package but may not be published yet). Bare RVTR for the 0 without package files.

Do **not** relabel until Browser Plus, label matcher, and live queue no longer read DK or deck-index for decisions.

---

## Artifacts preserved

All package JSON content (story cards, chart cards, artist facts, covers, timelines, related songs) is **unaffected** by DK retirement. Only label prefix and deck-index workflow signals are retired.

