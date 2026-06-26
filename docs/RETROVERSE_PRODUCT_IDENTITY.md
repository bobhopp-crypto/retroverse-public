# Retroverse Product Identity & Navigation

**Purpose:** Shared product shell — identity, themes, icons, and navigation so operators always know where they are.  
**Scope:** Design specification only (D-003). No routing changes, no backend, no feature work.  
**Updated:** 2026-06-26 (D-003)

**Related docs:**

- [RETROVERSE_PRODUCT_MAP.md](./RETROVERSE_PRODUCT_MAP.md) — product boundaries and relationships (D-002)
- [docs/studio/STUDIO_BRAIN.md](./studio/STUDIO_BRAIN.md) — Studio milestones and kernel
- [app/ops/studio/studio-design-tokens.css](../app/ops/studio/studio-design-tokens.css) — Studio tokens (D-001)

---

## 1. Product Identity Specification

Each Retroverse product is a **distinct application** with its own name, color theme, icon, and mission. Products share canonical data (RVTR graph) but **never share visual language**.

| Field | Definition |
|-------|------------|
| **Name** | Short product label shown in switcher and page chrome |
| **Slug** | Stable id for CSS `data-product`, tokens, analytics |
| **Mission** | One-line operator purpose — always visible in product chrome |
| **Theme** | Background + accent palette — instant recognition |
| **Icon** | 24×24 mark used in switcher, favicon variants, mobile |
| **Mental model** | How the operator should *feel* using it |

---

### Retroverse Browser

| Field | Value |
|-------|-------|
| **Name** | Browser |
| **Slug** | `browser` |
| **Mission** | Manage the music library. |
| **Mental model** | *The music library workbench* |
| **Operator** | DJ / library curator |
| **Theme** | VirtualDJ Red / Black |
| **Primary routes** | `/ops/browser-plus`, `/ops/browser-plus-2` (library zone) |

**Visual feel:** Deck-like, tactile, warm red on deep black — closer to DJ software than SaaS. Thick edges, high contrast, metadata-dense tables acceptable.

**Must not look like:** Studio mission control, cream Public Archive, generic admin dashboard.

---

### Retroverse Studio

| Field | Value |
|-------|-------|
| **Name** | Studio |
| **Slug** | `studio` |
| **Mission** | Produce patron experiences. |
| **Mental model** | *The production studio* |
| **Operator** | Producer / studio operator |
| **Theme** | Studio Blue / Gold (mission control dark) |
| **Primary routes** | `/ops/studio`, `/ops/studio/*`, `/ops/intelligence`, `/ops/browser-plus-2` (mission control zone) |

**Visual feel:** Broadcast ops center — dark navy, blue info glow, gold “on air” working state, green healthy. Large type, lamp indicators, department grid.

**Design system:** Canonical tokens `--rs-studio-*` in `studio-design-tokens.css` (D-001).

**Must not look like:** VDJ red deck, Public Archive cream/paper, fintech glass cards.

---

### Knowledge

| Field | Value |
|-------|-------|
| **Name** | Knowledge |
| **Slug** | `knowledge` |
| **Mission** | Remember everything. |
| **Mental model** | *The institutional memory* |
| **Operator** | Builder / archivist / future-you |
| **Theme** | **Slate Archive** — see §4 (proposed; was TBD in D-002) |
| **Primary routes** | *Future:* `/ops/knowledge` — today: `docs/knowledge/`, Cursor rules, agent indexes |

**Visual feel:** Card catalog / ledger — calm, readable, cross-linked. Less “live ops,” more “durable record.” Not the Public Archive patron aesthetic (that stays cream/teal collectible).

**Must not look like:** Live mission control dashboards or VDJ workbench.

---

### Out of scope (this milestone)

| Surface | Notes |
|---------|-------|
| **Public Archive** | Patron-facing `retroverse.live` — separate identity (cream/paper/teal). Not part of ops product switcher. |
| **Command Center** | `/ops` hub — infrastructure launcher, not a product. Stays neutral/dark gray until wrapped by shared shell. |
| **Future products** | Finance, Live, Workshop — placeholders in product map only. |

---

## 2. Navigation Proposal

### 2.1 Top-level product switcher

A **universal strip** sits above all ops product surfaces. It is identical on every product — only the “current product” block below it changes theme.

```
┌──────────────────────────────────────────────────────────────────┐
│  RETROVERSE          ◉ Browser    ○ Studio    ○ Knowledge        │
├──────────────────────────────────────────────────────────────────┤
│  ┌─ Current Product ─────────────────────────────────────────┐ │
│  │  [icon]  Studio                                              │ │
│  │          Produce patron experiences.                         │ │
│  │  Dashboard · Collector · Editor · Director · Publisher     │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  [ page content — product-themed ]                               │
└──────────────────────────────────────────────────────────────────┘
```

**Switcher behavior (design):**

| Element | Behavior |
|---------|----------|
| **RETROVERSE wordmark** | Links to `/ops` Command Center (launcher). Neutral styling — not product-colored. |
| **Product pills** | Browser · Studio · Knowledge. Filled dot (◉) = current product. Click navigates to product **home**, not last visited sub-route. |
| **Product homes** | Browser → `/ops/browser-plus-2` (or `/ops/browser-plus` if 2.0 unavailable); Studio → `/ops/studio`; Knowledge → `/ops/knowledge` *(future)* |
| **Keyboard** | `⌘/Ctrl + 1/2/3` switches product *(future)* |
| **Mobile** | Wordmark + hamburger product menu; mission line stays visible |

**Product homes (recommended):**

| Product | Home route | Rationale |
|---------|------------|-----------|
| Browser | `/ops/browser-plus-2` | Primary library surface; falls back to `/ops/browser-plus` |
| Studio | `/ops/studio` | Department hub + mission |
| Knowledge | `/ops/knowledge` *(stub)* | Future search/timeline UI; until built, link opens `docs/knowledge/` read-only viewer or Command Center Knowledge card |

---

### 2.2 Two-tier navigation model

```
Tier 1 — Retroverse strip     (shared, neutral dark)
Tier 2 — Product chrome       (themed: mission + product-local nav)
Tier 3 — Page content         (inherits product theme)
```

| Tier | Owner | Example (Studio) |
|------|-------|------------------|
| 1 | `RetroverseShell` | RETROVERSE + switcher |
| 2 | `StudioShell` (evolved) | Mission line + Collector / Editor / … |
| 3 | Page | Department dashboard |

Browser gets an equivalent **BrowserShell** tier-2 nav: Library · Match · Tags · Sync *(routes TBD; design placeholder)*.

Knowledge tier-2: Timeline · Graph · Inventory · Search *(aligned with `docs/knowledge/` outputs)*.

---

### 2.3 Browser+ 2.0 — split surface

Browser+ 2.0 is **one route, two products**. Navigation must not pretend it is only one.

**Recommended pattern:**

1. **Switcher** always shows both Browser and Studio as reachable; neither is “hidden.”
2. **Current product chip** follows **scroll context** or **primary panel**:
   - Library table, RVTR inspection, VDJ metadata → highlight **Browser**
   - Mission Control, Production Queue, department stats → highlight **Studio**
3. **Optional dual badge** in tier-2 chrome when both zones visible on large displays:

   ```
   Browser + Studio  ·  Library workbench with live mission control
   ```

4. **Deep links** preserve zone: `/ops/browser-plus-2#library` vs `#mission-control` *(future hash or query; no routing change in D-003)*.

This keeps Browser and Studio feeling like **different applications** even when co-located.

---

### 2.4 Command Center (`/ops`) relationship

Command Center remains the **neutral launcher** — not a fourth product in the switcher.

```
RETROVERSE (active: none — hub mode)

  Browser          Studio         Knowledge
  Manage the…      Produce…       Remember…

  [ existing category cards: All-Star, Live, Library, … ]
```

When on `/ops`, no product pill is filled; strip shows “Command Center” subtitle under wordmark.

---

## 3. Shared Shell Proposal

### 3.1 Component architecture *(design — not implemented)*

```
components/ops/shell/
  RetroverseShell.tsx       ← tier-1 strip + product chrome slot
  ProductSwitcher.tsx       ← pills, active state, homes
  ProductIdentity.tsx       ← icon + name + mission
  product-registry.ts       ← single source: slug, name, mission, theme, icon, homeHref
  retroverse-shell.css      ← tier-1 neutral tokens only

components/ops/studio/
  StudioShell.tsx           ← tier-2 only; wrapped by RetroverseShell (future)

components/ops/browser/
  BrowserShell.tsx          ← tier-2 only (future)

components/ops/knowledge/
  KnowledgeShell.tsx        ← tier-2 only (future)
```

**`product-registry.ts`** (conceptual):

```ts
export const RETROVERSE_PRODUCTS = [
  {
    slug: "browser",
    name: "Browser",
    mission: "Manage the music library.",
    homeHref: "/ops/browser-plus-2",
    themeClass: "rs-product--browser",
  },
  {
    slug: "studio",
    name: "Studio",
    mission: "Produce patron experiences.",
    homeHref: "/ops/studio",
    themeClass: "rs-product--studio",
  },
  {
    slug: "knowledge",
    name: "Knowledge",
    mission: "Remember everything.",
    homeHref: "/ops/knowledge",
    themeClass: "rs-product--knowledge",
  },
] as const;
```

### 3.2 DOM / CSS contract

Root layout applies product context without rewriting pages:

```html
<div class="rs-shell" data-product="studio">
  <header class="rs-shell__universe">…switcher…</header>
  <header class="rs-shell__product rs-product--studio">…identity + local nav…</header>
  <main class="rs-shell__main">…</main>
</div>
```

- **`data-product`** drives theme variables on tier-2 and main only.
- **Tier-1 strip** uses `--rs-universe-*` tokens (fixed neutral dark).
- Existing page roots (`.ops-page--bp2`, `.ops-studio`) remain; shell wraps them incrementally.

### 3.3 Migration path (no big-bang rewrite)

| Phase | Milestone | Work |
|-------|-----------|------|
| 1 | **D-003** *(this doc)* | Identity + nav spec |
| 2 | **D-004** *(future)* | `product-registry`, universe tokens, `RetroverseShell` stub |
| 3 | **D-005** *(future)* | Wrap `StudioShell` pages only |
| 4 | **D-006** *(future)* | Wrap Browser+ / Browser+ 2; split-surface context chip |
| 5 | **D-007** *(future)* | Knowledge surface + switcher link live |

**Constraint:** Each phase is additive. No routing changes unless explicitly approved.

### 3.4 What changes vs today

| Today | After shell (future) |
|-------|----------------------|
| `StudioShell` header = “Studio” brand only | Tier-1 RETROVERSE switcher + tier-2 Studio nav |
| `StudioShell` “Command Center” back link | Wordmark → `/ops`; product pills replace ambiguous back |
| Browser+ 2 header = ops title inline | Browser identity block + Studio block for mission control |
| `/ops` flat link list | Grouped by product with identity cards |

---

## 4. Color & Theme Mapping

### 4.1 Universe strip (tier-1 — shared)

Neutral — never Browser-red or Studio-blue.

| Token | Value | Use |
|-------|-------|-----|
| `--rs-universe-bg` | `#0a0c10` | Strip background |
| `--rs-universe-ink` | `#e8ecf4` | Wordmark, labels |
| `--rs-universe-ink-muted` | `#8a919e` | Inactive pills |
| `--rs-universe-border` | `rgba(255,255,255,0.08)` | Divider below strip |
| `--rs-universe-pill-active` | `product accent @ 20% bg + full accent text` | Filled dot pill |

### 4.2 Browser — VirtualDJ Red / Black

| Token | Value | Use |
|-------|-------|-----|
| `--rs-browser-bg-base` | `#0a0a0a` | Page background |
| `--rs-browser-bg-panel` | `#141414` | Cards, table chrome |
| `--rs-browser-accent` | `#c41e3a` | Primary accent (VDJ red) |
| `--rs-browser-accent-hot` | `#e8293f` | Hover, selection |
| `--rs-browser-ink` | `#f5f5f5` | Primary text |
| `--rs-browser-ink-muted` | `#9a9a9a` | Metadata columns |
| `--rs-browser-border` | `#2a2a2a` | Table rules, card edges |

**Semantic mapping (Browser):**

| Meaning | Color |
|---------|-------|
| Selected row / active tab | `--rs-browser-accent` |
| Linked RVTR / canonical hit | `#4fd5ff` *(shared info — sparingly)* |
| Warning / mismatch | `#ffb020` |
| Error / orphan file | `#ff6b6b` |

*File:* future `app/ops/browser/browser-design-tokens.css` — mirror D-001 structure, do not alias to Studio.

### 4.3 Studio — Blue / Gold *(canonical: D-001)*

Already defined as `--rs-studio-*`. Product shell **references** these; does not duplicate.

| Role | Token | Value |
|------|-------|-------|
| Base | `--rs-studio-bg-base` | `#061326` |
| Working / on-air | `--rs-studio-color-working` | `#e7bd67` |
| Info | `--rs-studio-color-info` | `#4fd5ff` |
| Healthy | `--rs-studio-color-healthy` | `#42f187` |

Shell maps `data-product="studio"` → `.rs-product--studio { /* inherits --rs-studio-* */ }`.

### 4.4 Knowledge — Slate Archive *(proposed D-003)*

Distinct from Studio navy and Browser black. Evokes **ledger / card catalog**, not patron cream.

| Token | Value | Use |
|-------|-------|-----|
| `--rs-knowledge-bg-base` | `#1a1d24` | Slate charcoal |
| `--rs-knowledge-bg-panel` | `#232830` | Cards, index panels |
| `--rs-knowledge-accent` | `#d4a853` | Amber ink — memory, highlights |
| `--rs-knowledge-accent-soft` | `#8b7355` | Secondary links |
| `--rs-knowledge-ink` | `#ece6dc` | Warm off-white body |
| `--rs-knowledge-ink-muted` | `#9a958c` | Timestamps, paths |
| `--rs-knowledge-link` | `#7eb8da` | Cross-links (cool, readable) |
| `--rs-knowledge-border` | `#3d424d` | Section rules |

**Why amber on slate:** Reads as “archive” and “annotation” without competing with Studio gold (which signals *live production*) or Public Archive cream (patron-facing).

**Approval note:** Knowledge theme marked **proposed** — confirm or revise before D-004 token file.

### 4.5 Theme swap summary

| Product | Background | Accent | Status |
|---------|------------|--------|--------|
| Browser | Black `#0a0a0a` | VDJ Red `#c41e3a` | Specified |
| Studio | Navy `#061326` | Gold `#e7bd67` + Blue `#4fd5ff` | **Live** (D-001) |
| Knowledge | Slate `#1a1d24` | Amber `#d4a853` | Proposed |
| Universe strip | `#0a0c10` | Neutral | Specified |

---

## 5. Icon Recommendations

Icons should feel **illustrated and collectible** — thick stroke, simple silhouette, readable at 24px. Prefer a single **Retroverse Ops Icon Set** (SVG, inline or sprite).

### 5.1 Browser

| Option | Description | Rationale |
|--------|-------------|-----------|
| **Recommended** | **Stacked vinyl** — two discs offset, red top disc | Instant “library / DJ” read; matches deck metaphor |
| Alt A | **Vertical faders** — three slider caps on black | VDJ hardware cue |
| Alt B | **Waveform bracket** — `[ ~~ ]` in red | Search/listening |

**Switcher color:** Red `#c41e3a` on `#141414` circle or square with thick outline.

### 5.2 Studio

| Option | Description | Rationale |
|--------|-------------|-----------|
| **Recommended** | **Broadcast lamp** — rounded rectangle + glow dot (on-air) | Matches mission control hero lamp (S-015) |
| Alt A | **Clapperboard** — open slate | Production metaphor |
| Alt B | **Department grid** — 2×2 squares, one gold | Matches department dashboard |

**Switcher color:** Gold lamp on navy `#071a36` background.

### 5.3 Knowledge

| Option | Description | Rationale |
|--------|-------------|-----------|
| **Recommended** | **Open book + node** — book spread with one graph dot and line | “Remember + connect” |
| Alt A | **Card catalog drawer** — labeled index tab | Archive metaphor |
| Alt B | **Timeline tick** — horizontal line with milestone diamonds | Timeline-first UI |

**Switcher color:** Amber `#d4a853` on slate `#232830`.

### 5.4 RETROVERSE wordmark

- **Ops strip:** `RETROVERSE` in small caps, letter-spaced, `--rs-universe-ink` — no product icon.
- **Favicon strategy:** Product-specific favicons when deep-linked (`browser.ico`, `studio.ico`, `knowledge.ico`); default retroverse mark on `/ops`.

### 5.5 Implementation note

Use **inline SVG** in `ProductSwitcher` for zero-latency theme color control via `currentColor`. Avoid emoji in production UI (work order example used ◉ for illustration only). Use CSS `::before` filled circle or SVG radio indicator for active pill.

---

## 6. Accessibility & Operator Clarity

| Rule | Detail |
|------|--------|
| **Mission always visible** | Tier-2 chrome shows mission on every product page — not only dashboard. |
| **Color never sole signal** | Active pill = dot + label weight + `aria-current="true"`. |
| **Contrast** | Browser red on black and Studio gold on navy must meet WCAG AA for text sizes used. |
| **Focus order** | Wordmark → product pills → product nav → main. |
| **Screen reader** | Strip: `nav aria-label="Retroverse products"`; identity block announces product name + mission. |

---

## 7. Agent & Milestone Discipline

1. **Do not merge product themes** — Browser pages must not pick up `--rs-studio-*` except shared universe strip.
2. **Identify product before UI work** — see [RETROVERSE_PRODUCT_MAP.md](./RETROVERSE_PRODUCT_MAP.md).
3. **Shell work is D-004+** — D-003 stops at this document; no S-017, no routing changes.
4. **Knowledge theme** — confirm amber/slate before token file lands.

---

## Document History

| Milestone | Change |
|-----------|--------|
| D-003 | Product identity spec, navigation proposal, theme mapping, icons, shared shell architecture |
