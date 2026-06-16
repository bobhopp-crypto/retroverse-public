# Retroverse Finance Dashboard Proposal

**Route:** `/ops/finance`  
**Audience:** Bob — decision-making, not accounting  
**Device:** 16-inch MacBook Pro (1728 × 1117 pt usable)  
**Data source:** `2021-2026 Financial Workbook.xlsx` (read-only import later)  
**Status:** Design proposal only — do not build yet

---

## Design principles

1. **One screen, no scroll** — everything visible at a glance  
2. **Large text** — 18px body minimum, 32–48px headline numbers  
3. **Plain language** — "Money in" not "Credits"; "Subscriptions" not "Recurring OPEX"  
4. **Decision-oriented** — show deltas, flags, and review items; hide transaction tables  
5. **Ops console aesthetic** — match existing `/ops` dark panel style from `ops.css`  
6. **No double-counting** — Amazon detail is drill-down only, not added to totals  

---

## Layout (desktop grid)

Target: **7 zones** in a 3-column × 3-row grid (~1680 × 1000px content area).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FINANCE HOME                          Jun 2026 · refreshed 2h ago      │
├──────────────────────┬──────────────────────┬───────────────────────────┤
│  MONEY IN            │  MONEY OUT           │  NET POSITION             │
│  $3,917/mo avg       │  $3,534/mo avg       │  +$383/mo                 │
│  Agnesian + SS       │  card + bills        │  NEBAT balance $—         │
├──────────────────────┴──────────────────────┴───────────────────────────┤
│  MONTHLY CASH FLOW (12-bar sparkline)                                     │
│  ████░░████████████  In vs Out · last 12 months                          │
├──────────────────────┬──────────────────────┬───────────────────────────┤
│  HOUSEHOLD           │  RETROVERSE          │  AI & TECH                │
│  Utilities  $354/mo  │  Ops  $337/mo        │  $206/mo (↑ 168%)         │
│  Food       $258/mo  │  equip lumpy         │  6 tools active           │
│  Housing    $233/mo  │  [Review equip]      │  [Review subs]            │
├──────────────────────┴──────────────────────┴───────────────────────────┤
│  SUBSCRIPTIONS — review queue (5)                                         │
│  ⚠ ChatGPT + Grok overlap   ⚠ 4 AI tools trial churn   ✓ Cursor keep    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Section specs

### Header

| Element | Content |
|---------|---------|
| Title | **Finance Home** |
| Kicker | Internal · personal |
| Period selector | `This month` / `YTD` / `12 mo` — default **YTD** |
| Last refresh | Timestamp from workbook import |

---

### 1. Income

**Purpose:** Answer "what's coming in?"

| Metric | Source | Display |
|--------|--------|---------|
| Monthly average | NEBAT deposits (exclude one-time: tax refund, stimulus, refinance) | **$3,917/mo** large number |
| Breakdown pills | Agnesian payroll, Social Security | Two chips below |
| YTD total | Sum deposits current year | Secondary |
| Trend | 12-month sparkline | Small inline chart |

**Exclude from recurring income:** Tax Refund, Stimulus, Refinance, Empower lump sums.

**Copy:** "Money in" — not "Revenue" or "Deposits".

---

### 2. Household

**Purpose:** Living costs separate from Retroverse.

| Line | Categories | Format |
|------|-----------|--------|
| Utilities | Power, water, internet, phone, gas, helium | $/mo avg |
| Food | Grocery + restaurants | $/mo avg |
| Housing | Home + NEBAT home loan | $/mo avg |
| Vehicle | Gas + truck + car insurance | $/mo avg |
| Medical | Medical | $/mo avg |
| Personal | Spa, shopping, personal | $/mo avg |

**Display:** Stacked horizontal bars proportional to spend — largest on top.  
**No transaction list.** Tap/click bar → future drill-down to category (phase 2).

**Flag:** If any line spikes >25% vs 6-month avg, show amber dot.

---

### 3. Retroverse

**Purpose:** Project operating cost — not hobby DJ gear unless tagged.

| Metric | Calculation |
|--------|-------------|
| Monthly ops | Web hosting + AI dev + 3D print + engraving + software media tools |
| YTD ops | Same, current year |
| Equipment (capital) | Audio/Lighting/Video Eq — separate line, labeled **"Gear (lumpy)"** |
| Annual estimate | Rolling 12-month ops sum |

**Display:**

```
Retroverse ops     $337/mo
Gear & equipment   $1,240 YTD   ← not in ops rate
Hosting            $8/mo        Cloudflare · Neon · Netlify
```

**Decision helper:** Green if ops < $500/mo; amber if $500–800; red if > $800.

---

### 4. AI

**Purpose:** Track the fastest-growing cost center.

| Metric | Display |
|--------|---------|
| Monthly spend | Large number with **% change vs prior 3 mo** |
| Annual run rate | Projected from YTD pace |
| % of total spend | Secondary |
| Active tools | Chips: Cursor, ChatGPT, Grok, Runpod, etc. |
| Review flags | Auto-generated from overlap rules |

**Overlap rules (from audit):**

- ChatGPT appears in 2 categories → show as 1 vendor
- Grok $517 annual → amortize $43/mo in run-rate view
- Flag if >3 AI tools have charges in same month

**Hardware hint (conditional):**

> At $206/mo you're spending ~$2,470/yr on AI cloud. A local GPU box pays back in ~18 months if it replaces cloud — [Compare →] *(phase 2 link, not built now)*

Only show when annual run rate > $1,800.

---

### 5. Subscriptions

**Purpose:** Review queue, not a 40-row table.

**Show top 5 by monthly cost** + any flagged items:

| Sub | ~$/mo | Status |
|-----|------:|--------|
| YouTube TV | $36 | OK |
| ChatGPT | $45 | ⚠ duplicate tag |
| Cursor | $38 | ✓ keep |
| Grok | $43 | ⚠ overlaps ChatGPT |
| Adobe | $14 | Review |

**Footer:** `+ 12 more · $89/mo` — expandable in phase 2.

**Recurring detector:** Same logic as audit — category prefix `SUB -`, `AI -`, `Software -`, `Storage -`, `Web -`; group by vendor after normalization.

---

### 6. Monthly Cash Flow

**Purpose:** One visual — are months positive or negative?

| Element | Spec |
|---------|------|
| Chart type | 12-month grouped bars: In (teal) vs Out (orange) |
| Height | 120px fixed |
| Labels | Month abbrev only |
| Net line | Dotted overlay |

**Out calculation:** Apple Card purchases + NEBAT withdrawals (excl. Apple Card payment transfers to avoid double-count).

**Copy:** "Monthly cash flow" — subtitle: "NEBAT account · card spend overlaid"

---

### 7. Net Position

**Purpose:** Bottom-line snapshot.

| Metric | Source |
|--------|--------|
| NEBAT balance | Latest balance column |
| Apple Card balance | Not in workbook today — show **"—"** with note "add manual or API" |
| Net monthly | Avg deposits − avg spend |
| Runway | NEBAT balance ÷ avg monthly out (if computable) |

**Display:**

```
Net position
─────────────
NEBAT          $4,218
Apple Card     —
─────────────
Monthly net    +$383
```

Large monospace numbers. No cents unless < $100.

---

## Typography & visual spec

| Element | Size | Weight |
|---------|------|--------|
| Section title | 11px uppercase | 900, letter-spacing 0.12em, dim |
| Hero number | 42px | 900 |
| Secondary number | 24px | 800 |
| Body / labels | 16–18px | 600 |
| Flags | 13px | 800 |

**Colors** (reuse ops tokens):

- `--ok` green: positive cash flow, healthy
- `--warn` amber: review items
- `--bad` red: overspend vs budget
- `--accent` teal: Retroverse ops
- `--info` blue: AI section accent

**Cards:** 2px border, no glassmorphism, dense padding (match `ops-home` sections).

---

## Data model (future import — not built now)

```typescript
type FinanceDashboardData = {
  generatedAt: string;
  period: "month" | "ytd" | "12mo";
  income: { monthlyAvg: number; ytd: number; sources: { label: string; amount: number }[] };
  household: { line: string; monthlyAvg: number; ytd: number; flag?: boolean }[];
  retroverse: { opsMonthly: number; gearYtd: number; hostingMonthly: number; annualEstimate: number };
  ai: { monthlyAvg: number; runRateAnnual: number; pctOfSpend: number; tools: string[]; flags: string[] };
  subscriptions: { vendor: string; monthly: number; status: "ok" | "review" | "keep" }[];
  cashFlow: { month: string; in: number; out: number }[];
  net: { nebatBalance: number; appleCardBalance: number | null; monthlyNet: number };
};
```

**Import rules:**

1. Parse workbook sheets — do not mutate source file  
2. Normalize vendor names (merge ChatGPT categories, etc.)  
3. Exclude NEBAT `Apple`/`APPLE` withdrawals from spend (transfers)  
4. Amazon sheet for drill-down only  
5. Cache parsed JSON in `reports/finance-cache.json` (generated, gitignored)

---

## What NOT to show

- Raw transaction tables on home screen  
- Accounting terms (OPEX, COGS, amortization)  
- Tax categories  
- PayPal history older than 12 months  
- Category naming inconsistencies (normalize before display)  
- Double-counted Amazon  

---

## Implementation phases (when approved)

| Phase | Scope |
|-------|-------|
| **F1** | `load-finance-dashboard.ts` — parse workbook, normalize vendors |
| **F2** | `/ops/finance` page + `FinanceHome.tsx` + CSS |
| **F3** | Review queue rules + overlap detection |
| **F4** | Drill-down routes (`/ops/finance/subscriptions`, `/ops/finance/retroverse`) |
| **F5** | Apple Card balance manual entry or API |

---

## Success criteria

On a 16" MacBook Pro, Bob can answer in **5 seconds**:

1. Am I cash-flow positive?  
2. What does Retroverse cost me per month?  
3. Is AI spend getting out of hand?  
4. Which subscriptions should I kill this week?  
5. What's my NEBAT balance?

No scrolling. No spreadsheet. No jargon.

---

*Proposal based on `reports/finance-workbook-audit.md`. No code or data changes made.*
