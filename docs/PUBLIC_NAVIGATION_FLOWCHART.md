# Retroverse Public Navigation Flowchart

**Status:** Visual companion to `docs/PUBLIC_NAVIGATION_MAP.md`  
**Date:** 2026-05-27  
**Scope:** Mermaid diagrams only — no runtime changes

Legend (diagram styles):
- **Green** = locked / foundational
- **Yellow** = fragile — change carefully
- **Red** = weak / dead-end / confusion risk
- **Gray** = legacy / redirect / dev-only
- **Purple** = duplicate system (parallel path to same place)

---

## 1. Primary user flow

**Intended loop:** QR → Home → Search → Entity → Related → (optional chronology) → Search again.

```mermaid
flowchart TB
  QR([QR / first visit]) --> Home["/ HOME<br/>directory board"]

  Home --> Terminal["Primary terminal"]
  Terminal --> Overlay["Search OVERLAY<br/>(modal)"]

  Home --> SearchPage["/search<br/>URL-backed"]

  Overlay -->|"click suggestion / Enter"| Entity{"Entity exhibit"}
  SearchPage -->|"result cards"| Entity

  Entity --> Artist["/artist/slug"]
  Entity --> Album["/album/id"]
  Entity --> Track["/track/id"]

  Artist --> Related["Related artist/album/track"]
  Album --> Related
  Track --> Related
  Related --> Entity

  Artist --> Chrono["Chronology<br/>/rv or /charts"]
  Album --> Chrono
  Track --> Chrono

  Chrono --> Week["Week cards"]
  Week --> Entity

  Artist --> FooterSearch["Footer → /search"]
  Album --> FooterSearch
  Track --> FooterSearch
  FooterSearch --> SearchPage

  Overlay -.->|"browser back"| HomeLost["/ HOME<br/>query LOST"]
  HomeLost -.->|"weak continuity"| Terminal

  classDef locked fill:#c8e6c9,stroke:#2e7d32,color:#1b5e20
  classDef fragile fill:#fff9c4,stroke:#f9a825,color:#f57f17
  classDef weak fill:#ffcdd2,stroke:#c62828,color:#b71c1c

  class Home,Terminal,Entity,Artist,Album,Track,FooterSearch locked
  class Overlay,SearchPage,Chrono,Week fragile
  class HomeLost weak

  linkStyle 0,1,2,3,4,5,6,7,8,9,10,11,12,13,14 stroke:#2e7d32,stroke-width:3px
```

**Strongest path (thick green):** Home → overlay/search → entity → footer search → repeat.

---

## 2. Full public navigation tree

Directional map of all public routes and major exits.

```mermaid
flowchart TB
  subgraph HOME_SYS["HOME /"]
    H["/"]
    H --> OVL["(overlay)"]
    H --> PAD_A["pad: Artists"]
    H --> PAD_B["pad: Albums"]
    H --> PAD_T["pad: Tracks"]
    PAD_A --> OVL
    PAD_B --> OVL
    PAD_T --> OVL
    H --> PAD_C["pad: Charts → /rv/1978"]
    H --> FB["feedback mailto"]
    H --> OPS_LINK["Archive Ops"]
  end

  subgraph SEARCH_SYS["SEARCH"]
    SP["/search?q="]
    SP --> SP_HOME["→ /"]
    SP --> SP_RES["panels → entities"]
    SP --> SP_CHARTS["RV panel → /rv/1978"]
  end

  subgraph ENTITY_SYS["EXHIBITS"]
    AR["/artist/slug"]
    AR --> AR_CH["/artist/.../charts"]
    AR --> AR_LIB["/artist/.../library"]
    AR --> AR_EXP["/artist/.../explore"]
    AR --> AR_HID["/albums /tracks /years /related"]
    AL["/album/id"]
    TR["/track/id"]
  end

  subgraph CHRONO_SYS["CHRONOLOGY"]
    RV["/rv/YEAR"]
    RVM["/rv/YEAR/MONTH"]
    RVW["/rv/YEAR/MONTH/DATE"]
    CH["/charts redirect"]
    WK["week cards<br/>ArtistChartsHistoryClient"]
    RV --> RVM --> WK
    RVM --> RVW --> WK
    CH --> RV
    AR_CH --> WK
  end

  OVL --> AR
  OVL --> AL
  OVL --> TR
  OVL --> RV
  OVL --> CH
  SP_RES --> AR
  SP_RES --> AL
  SP_RES --> TR

  PAD_C --> RV
  AR --> AL
  AR --> TR
  AL --> AR
  AL --> TR
  TR --> AR
  TR --> AL
  AL --> RV
  TR --> RV
  AR_CH --> AL
  AR_CH --> TR

  RV -->|"month card"| RVM
  RV -->|"notable week"| RVW
  CH --> RV
  CH --> RVM
  CH --> RVW
  WK --> AL
  WK --> TR

  AR --> SP
  AL --> SP
  TR --> SP
  AR --> H
  AL --> H
  TR --> H
  RV --> SP
  CH --> SP
  RV --> H
  CH --> H

  subgraph FOOTER["Shared footer contract"]
    F1["Home"]
    F2["Search"]
    F3["Artist context"]
  end
  AR --> F1
  AL --> F1
  TR --> F1

  subgraph LEGACY["LEGACY"]
    BR["/browse/*"] --> H
  end

  classDef locked fill:#c8e6c9,stroke:#2e7d32
  classDef fragile fill:#fff9c4,stroke:#f9a825
  classDef dup fill:#e1bee7,stroke:#7b1fa2
  classDef legacy fill:#eeeeee,stroke:#757575

  class H,OVL,SP,AR,AL,TR,F1,F2 locked
  class RV,CH,API,WK,AR_CH fragile
  class CH,RV dup
  class BR legacy
```

---

## 3. Chronology flow

**Canonical:** `/rv/[year]` → `/rv/[year]/[month]` → `/rv/[year]/[month]/[YYYY-MM-DD]`. Legacy `/charts?…` redirects into this tree.

```mermaid
flowchart LR
  subgraph ENTRY["Entry paths"]
    E1["Charts pad<br/>/rv/1978"]
    E2["Overlay recovery<br/>/rv/YEAR"]
    E3["/search RV panel<br/>→ /rv/1978"]
    LEG["/charts?…"]
  end

  subgraph RV_SHELL["RV chronology — single chrome"]
    RV["/rv/YEAR"]
    RVM["/rv/YEAR/MONTH"]
    RVW["/rv/YEAR/MONTH/DATE"]
    RV_PREV["← year"]
    RV_NEXT["year →"]
    RV_SEARCH["topbar Search"]
  end

  subgraph SHARED["Shared week layer"]
    WK["ArtistChartsHistoryClient<br/>month → week cards"]
    ENT["/album /track"]
  end

  E1 --> RV
  E2 --> RV
  E3 --> RV
  LEG --> RV
  LEG --> RVM
  LEG --> RVW

  RV --> RV_PREV
  RV --> RV_NEXT
  RV --> RVM
  RVM --> WK
  RVW --> WK
  WK --> ENT

  RV_SEARCH --> SEARCH["/search"]
  RVM --> SEARCH

  classDef locked fill:#c8e6c9,stroke:#2e7d32
  classDef legacy fill:#eeeeee,stroke:#757575

  class WK,ENT locked
  class RV,RVM,RVW locked
  class LEG legacy
```

---

## 4. Entity relationship map

```mermaid
flowchart TB
  subgraph SEARCH_LAYER["Search layer — LOCKED"]
    SO["Search overlay"]
    SP["/search"]
  end

  ART["Artist exhibit<br/>/artist/slug"]
  ALB["Album exhibit<br/>/album/id"]
  TRK["Track exhibit<br/>/track/id"]

  SO --> ART
  SO --> ALB
  SO --> TRK
  SP --> ART
  SP --> ALB
  SP --> TRK

  ART <-->|"album tiles / view-all"| ALB
  ART <-->|"song stack / view-all"| TRK
  ALB <-->|"tracklist"| TRK
  ART <-->|"related cards"| ART2["Other artist"]

  ART --> ACH["/artist/.../charts"]
  ACH --> CHW["Week snapshots"]
  CHW --> ALB
  CHW --> TRK

  ALB --> RVY["/rv/year<br/>if chart data"]
  TRK --> RVY
  RVY --> CHW

  ART --> FOOT["Footer: Home · Search"]
  ALB --> FOOT
  TRK --> FOOT

  classDef locked fill:#c8e6c9,stroke:#2e7d32
  classDef fragile fill:#fff9c4,stroke:#f9a825

  class SO,SP,ART,ALB,TRK,FOOT locked
  class ACH,CHW,RVY fragile
```

---

## 5. Problem map

Nodes labeled by issue type. See `PUBLIC_NAVIGATION_MAP.md` for full tables.

```mermaid
flowchart TB
  subgraph PUBLIC["PUBLIC ARCHIVE"]
    P_HOME["/ HOME"]
    P_SEARCH["Search surfaces"]
    P_ENT["Entities"]
    P_CHR["Chronology"]
  end

  subgraph ISSUES["Issue hotspots"]
    I1["WEAK: overlay back<br/>loses query"]
    I2["DUPLICATE: /rv vs /charts"]
    I3["DUPLICATE: overlay vs /search"]
    I4["DEAD: /artist/.../years<br/>no /rv links"]
    I5["DEAD: sparse → /inspect<br/>404 in prod"]
    I6["WEAK: week card<br/>no ID → no link"]
    I7["LEGACY: /browse/* → /"]
    I8["LEGACY: home-poster-frame.tsx"]
    I9["ISOLATED: /charts<br/>no home pad"]
  end

  P_HOME --> P_SEARCH
  P_SEARCH --> P_ENT
  P_ENT --> P_CHR
  P_CHR --> P_ENT
  P_ENT --> P_SEARCH

  P_HOME -.-> I1
  P_SEARCH -.-> I3
  P_CHR -.-> I2
  P_CHR -.-> I9
  P_ENT -.-> I4
  P_ENT -.-> I5
  P_CHR -.-> I6
  P_HOME -.-> I7
  P_HOME -.-> I8

  classDef ok fill:#c8e6c9,stroke:#2e7d32
  classDef weak fill:#ffcdd2,stroke:#c62828
  classDef dup fill:#e1bee7,stroke:#7b1fa2
  classDef dead fill:#ef9a9a,stroke:#b71c1c
  classDef legacy fill:#eeeeee,stroke:#616161

  class P_HOME,P_SEARCH,P_ENT,P_CHR ok
  class I1,I6 weak
  class I2,I3,I9 dup
  class I4,I5 dead
  class I7,I8 legacy
```

| Label | Meaning |
|-------|---------|
| WEAK | Works but breaks continuity / trust |
| DUPLICATE | Two paths, same outcome, different UX |
| DEAD | User hits wall or misleading link |
| LEGACY | Stale route or unused code |
| ISOLATED | Hard to reach from main loop |

---

## 6. Ops separation map

Public archive and ops are separate by env + middleware. No ops in exhibit footers.

```mermaid
flowchart TB
  subgraph PUBLIC_ZONE["PUBLIC — default production"]
    QR2([User])
    QR2 --> PUB_HOME["/"]
    QR2 --> PUB_SEARCH["/search"]
    QR2 --> PUB_ENT["/artist /album /track"]
    QR2 --> PUB_RV["/rv /charts"]
    PUB_HOME --> PUB_SEARCH
    PUB_SEARCH --> PUB_ENT
  end

  subgraph OPS_ZONE["OPS — gated"]
    OPS_ENV{"RETROVERSE_OPS=1?"}
    OPS_ENV -->|no| OPS_404["/ops → 404"]
    OPS_ENV -->|yes| OPS_PIN["/internal/ops-pin"]
    OPS_PIN -->|PIN cookie| OPS_HOME["/ops"]
    OPS_HOME --> OPS_HEAL["/ops/healing"]
    OPS_HOME --> OPS_MEDIA["/ops/media-sync"]
    OPS_HOME --> OPS_ACQ["/ops/acquisition"]
  end

  PUB_HOME -->|"only if ops env"| OPS_ENV

  subgraph DEV_ONLY["Dev-only — not public IA"]
    INS["/inspect"]
    CC["/control-center"]
  end

  PUB_ENT -.->|"sparse exhibit only"| INS

  classDef public fill:#c8e6c9,stroke:#2e7d32
  classDef ops fill:#bbdefb,stroke:#1565c0
  classDef dev fill:#eeeeee,stroke:#757575
  classDef block fill:#ffcdd2,stroke:#c62828

  class PUB_HOME,PUB_SEARCH,PUB_ENT,PUB_RV public
  class OPS_HOME,OPS_HEAL,OPS_MEDIA,OPS_ACQ ops
  class INS,CC dev
  class OPS_404 block
```

**Gate chain:** `RETROVERSE_OPS=1` → middleware on `/ops/*` → cookie after PIN → ops pages. API `/api/ops/*` requires same cookie.

---

## Locked vs fragile (quick reference)

```mermaid
quadrantChart
  title Stability vs change risk (conceptual)
  x-axis Low user confusion --> High user confusion
  y-axis Safe to change --> Do not refactor
  quadrant-1 Lock — high confusion
  quadrant-2 Lock — stable
  quadrant-3 OK to simplify
  quadrant-4 Fragile — simplify carefully
  Homepage pads: [0.2, 0.85]
  Entity routes: [0.15, 0.9]
  Fail-open exhibits: [0.1, 0.95]
  Search routing: [0.2, 0.88]
  Smoke governance: [0.05, 0.98]
  Overlay continuity: [0.75, 0.35]
  Chronology split: [0.9, 0.4]
  Charts crossover: [0.85, 0.45]
  Legacy browse/poster: [0.5, 0.15]
```

| LOCKED | FRAGILE |
|--------|---------|
| Homepage pad model | Chronology `/rv` + `/charts` split |
| Fail-open exhibits | Overlay session (no URL) |
| Search entity routes | Month → `/charts` crossover |
| `sanitizePublicNavigationHref` | Week card ID gaps |
| Smoke test CI | Hidden artist sections |

---

## Governance

- **Text map:** `docs/PUBLIC_NAVIGATION_MAP.md`
- **Visual map:** this file
- Update both when public navigation changes.

---

## Deployment impact

**None.** Documentation only.
