# Explorer Layout v1 — Public Design System

**Status:** FROZEN (canonical public RetroVerse Live theme)  
**Source files:** `packages/shared/components/explorer/explorer-layout-v1-tokens.css`, `packages/shared/components/retroverse-2/rv2-public-shell.css`, `apps/live/app/week/[date]/chart-week-portal.css`

Every future **public Live** page must consume these tokens. Do not introduce alternate palettes, Studio blue panels, cream exhibit shells, or page-local color systems on RV2 routes.

---

## 1. Color tokens

Defined in `explorer-layout-v1-tokens.css` on `:root`, `.rv-global-nav`, `.rv2-live`, `.explorer`.

### Surfaces

| Token | Value | Use |
|-------|-------|-----|
| `--ex-bg` | `#050814` | Page background base |
| `--ex-bg-mid` | `#070818` | Vertical gradient mid-tone |
| `--ex-panel` | `rgba(7, 8, 24, 0.92)` | Cards, sticky panels |
| `--ex-panel-strong` | `rgba(12, 10, 32, 0.95)` | Elevated panels |
| `--ex-surface` | `rgba(255, 255, 255, 0.04)` | Subtle fills |
| `--ex-header` | `rgba(7, 8, 24, 0.88)` | Sticky headers |
| `--ex-art-fallback` | `linear-gradient(145deg, #1a1040, #0a0820)` | Missing artwork |

### Ink

| Token | Value | Use |
|-------|-------|-----|
| `--ex-ink` | `#fff5ff` | Primary text |
| `--ex-ink-soft` | `#e3d9ff` | Secondary body |
| `--ex-muted` | `#b9a9d9` | Metadata, labels |

### Lines

| Token | Value | Use |
|-------|-------|-----|
| `--ex-line` | `rgba(255, 255, 255, 0.07)` | Row dividers, subtle borders |
| `--ex-line-accent` | `rgba(168, 85, 255, 0.28)` | Interactive borders, nav pills |

### Accents

| Token | Value | Use |
|-------|-------|-----|
| `--ex-purple` | `#a855ff` | Primary accent, play direct, focus |
| `--ex-purple-deep` | `#7c3aed` | Button gradients |
| `--ex-purple-glow` | `rgba(168, 85, 255, 0.55)` | Focus glow |
| `--ex-purple-dim` | `rgba(168, 85, 255, 0.18)` | Active nav fill |
| `--ex-owned` / `--ex-aqua-accent` | `#22e7ff` | Library ✓/+, aqua labels |
| `--ex-aqua-glow` | `rgba(34, 231, 255, 0.45)` | Aqua emphasis |
| `--ex-magenta` | `#ff44aa` | Live / Return to Live |
| `--ex-magenta-dim` | `rgba(255, 68, 170, 0.18)` | Live button fill |
| `--ex-youtube` | `#ff4466` | YouTube search affordance |
| `--ex-amber` | `#e7bd67` | Chart / song category headers |

### Legacy bridge (`rv2-public-shell.css`)

Public pages still reference `--rv2-*` in older CSS. These map to Explorer tokens:

- `--rv2-bg`, `--rv2-ink`, `--rv2-muted`, `--rv2-cyan` → Explorer equivalents
- `--rv2-line`, `--rv2-line-hot` → purple borders
- `--rv2-btn-gradient` → purple CTA gradient
- `--rv2-surface-*`, `--rv2-border-*`, `--rv2-fill-*` → tinted surfaces

**Forbidden on public Live:** legacy Studio blue (`#061326`, `#2c75ff`, `#1f79ff`, `rgba(87, 146, 255, …)`).

---

## 2. Typography hierarchy

**Font stack:** `"Avenir Next", "Trebuchet MS", "Segoe UI", system-ui, sans-serif`

| Level | Size | Weight | Letter-spacing | Color |
|-------|------|--------|----------------|-------|
| Page title | `clamp(1.5rem, 6vw, 2rem)` – `clamp(2.6rem, 10vw, 4.4rem)` | 950 | `-0.03em` to `-0.05em` | `--ex-ink` |
| Section title | `1.05rem` | 900 | `-0.02em` | `--ex-ink` |
| Explorer row title | `15–16px` | 800 | `-0.02em` | `--ex-ink` |
| Eyebrow / kicker | `0.62–0.68rem` | 800–950 | `0.13–0.14em`, uppercase | `--ex-purple` or `--ex-aqua-accent` |
| Metadata | `12–0.82rem` | 650–750 | normal | `--ex-muted` |
| Rank numeral | `15px` (18px focus) | 900 | tabular-nums | muted purple-gray |

No thin SaaS captions. Hierarchy is bold and editorial.

---

## 3. Spacing rules

| Context | Rule |
|---------|------|
| Shell max width | `72rem`, centered |
| Shell padding | `0.65rem` mobile → `0.9rem` tablet+ |
| Section padding | `1.1rem 0.85rem` (artist), `0.65–0.85rem` (explorer header) |
| Row padding | `11px 14px 11px 12px` |
| Row gap | `10px` internal, `6px` action cluster |
| Touch minimum | `--ex-touch: 44px` for back links, pills, primary taps |
| Safe area | `env(safe-area-inset-top/bottom)` on sticky chrome |

---

## 4. Button styles

All public action buttons use class prefix `explorer-btn` or RV2 shell buttons.

### Explorer row actions (always exactly two)

| Button | Class | Appearance | Behavior |
|--------|-------|------------|----------|
| Play | `explorer-btn explorer-btn--play` | Always visible | `explorer-btn--play-direct` (solid purple) when owned/YouTube; `explorer-btn--play-search` (dashed) opens YouTube search |
| Library | `explorer-btn explorer-btn--library-check` or `--library-acquire` | ✓ aqua when owned; + when missing | Display only (acquire coming soon) |

**Size:** 36×36px min, `border-radius: 10px`.

### Shell CTAs

- Search submit / view-all: `--rv2-btn-gradient` (purple), `--rv2-border-btn`
- Album CTAs: `--rv2-btn-gradient-aqua`
- Song/chart CTAs: `--rv2-btn-gradient-amber`
- Return to Live: magenta border + `--ex-magenta-dim` fill

---

## 5. Hero style

Used on Artist page and entity headers within Broadcast shell.

- Sticky or static header band: `--ex-header` background, `--ex-line` bottom border
- Back link: `explorer__back`, muted → ink on hover
- Portrait: `96–120px`, `border-radius: 14px`, purple-tinted border
- Eyebrow: uppercase purple label ("Artist")
- Name: large bold `--ex-ink`
- Tagline / meta: `--ex-ink-soft` / `--ex-muted`
- Active years label: `--ex-owned` accent on label text

No cream paper, no thick charcoal frames on RV2 routes.

---

## 6. Explorer row rules

**Canonical reference:** Chart Week (`/week/[date]`) and Artist Top Songs.

Structure:

```
[rank] [artwork] [title + meta]     [▶ Play] [✓|+]
└──────── row hit (link to Song) ────────┘   └── actions (stop propagation)
```

Rules:

1. Row body (`explorer-row__hit`) navigates to Song page — entire row except actions.
2. Exactly **two** trailing buttons: Play + Library. Never one. Never three.
3. No Info button. No status dots. No legends.
4. Focus/current row: `explorer-row--current` — purple glow, larger art/rank/play.
5. Divider: `border-bottom: 1px solid var(--ex-line)`.
6. Hover: `background: rgba(255, 255, 255, 0.025)`.

---

## 7. Section spacing

| Pattern | Treatment |
|---------|-----------|
| Section block | `artist-v1__section` padding `1.1rem 0.85rem 0.25rem` |
| Section title + lead | Title then optional `section-lead` in `--ex-muted` |
| Album shelf | Horizontal scroll, `108–124px` cards, snap |
| Year pills | Purple border pills, min-height 44px |
| Related artists | Rounded cards, circular art |
| Footer links | Top border `--ex-line`, purple Live link |

---

## 8. Artwork treatment

Fallback order (never broken image):

1. Canonical image URL from graph
2. Related album/song art
3. RetroVerse generated placeholder (`ArtistCover` / archive plate)
4. `--ex-art-fallback` gradient plate

Thumbnails: `border-radius: 8px` (rows), `10–14px` (cards), `1px solid rgba(255,255,255,0.12–0.18)`.

---

## 9. Interaction rules

| Interaction | Rule |
|-------------|------|
| Motion easing | `--ex-ease: cubic-bezier(0.22, 1, 0.36, 1)` |
| Button press | `scale(0.94)` on active |
| Focus visible | `outline: 2px solid var(--ex-purple)` |
| Reduced motion | Disable transitions when `prefers-reduced-motion` |
| Play | Never hidden; direct vs search variant only |
| Library | ✓ or + only; never both |
| Search panel | Hidden on Explorer embed routes (`.rv2-explorer`) |

---

## 10. Shell composition

Public pages wrap content in `Rv2PublicShell`:

```tsx
<Rv2PublicShell className="rv2-{route} rv2-explorer?" activeNav="…">
```

Includes:

- `rv2-live__grid-glow` — purple grid overlay
- Local nav: Return to Live, Live, Search, Years, Charts
- Optional search panel (hidden on pure Explorer views)
- `rv2-public-shell__body` — page content

Global nav (`RetroverseGlobalNav`) sits above shell; uses same token import.

---

## 11. Adoption checklist (new public pages)

- [ ] Import or inherit `explorer-layout-v1-tokens.css` via `rv2-public-shell.css`
- [ ] Use `--ex-*` or bridged `--rv2-*` only — no hardcoded blues
- [ ] Song lists use Explorer row pattern when showing playable catalog rows
- [ ] Mobile-first; 44px touch targets
- [ ] Artwork fallbacks wired
- [ ] No Studio/ops controls on public surface

---

## 12. Out of scope (not Explorer v1)

These retain their own palettes until explicitly migrated:

- Legacy cream **Artist sub-routes** (`/artist/[slug]/songs`, etc.)
- **Sunday Nights**, **Track exhibit**, **Pass** paper routes
- **BobOS / Studio / Ops** surfaces
- **Broadcast Control** (composer, cockpit)

Do not copy Explorer tokens into Studio. Do not copy Studio blue into public Live.
