# Financial Workbook Audit

**Source:** `/Users/bobhopp/FINANCIAL/2021-2026 Financial Workbook.xlsx`  
**Audited:** 2026-06-15  
**Method:** Read-only analysis of all worksheets. No data modified.

---

## 1. Inventory

### Worksheets (5 total)

| Sheet | Rows | Purpose |
|-------|------|---------|
| **PIVOT** | 46 | Live summary dashboard — category totals per account source, filtered by year (currently Apple **2026**, Amazon/NEBAT/PayPal **2025**). Not a transaction ledger. |
| **APPLE** | 3,450 | Primary spend ledger — Apple Card transactions with manual category tags, merchant, type, and amount. |
| **AMAZON** | 894 | Itemized Amazon order detail — order date, internal account bucket, title, line total. |
| **NEBAT** | 735 | Checking account ledger — NEBAT credit union deposits, withdrawals, running balance, internal account tags. |
| **PAYPAL** | 61 | PayPal outflows — mostly one-off purchases and a few subscriptions (Canva, Office 365, Tune My Music). Includes an embedded mini-summary block in columns P+ (duplicate structure). |

### Date ranges

| Source | First | Last | Notes |
|--------|-------|------|-------|
| Apple Card | 2020-01-01 | **2026-06-09** | Active through early June 2026 |
| Amazon detail | 2020-01-07 | 2026-01-12 | Stops Jan 2026 — may need refresh |
| NEBAT | 2020-03-15 | **2026-12-21** | One future-dated row: scheduled Apple Card payment ($2,000 on 2026-12-21) |
| PayPal | 2020-06-02 | 2025-12-21 | Sparse — 60 payment rows |

### Account data identified

| Account | Where | Role |
|---------|-------|------|
| **Apple Card** | APPLE sheet + NEBAT withdrawals tagged `Apple` / `APPLE` | Primary consumer spending card (~$217k gross purchases 2020–Jun 2026) |
| **Amazon** | APPLE category `Amazon` ($42.5k) + AMAZON itemization ($45.6k) + NEBAT `Amazon` transfers ($3.4k) | Itemized in AMAZON sheet; charged via Apple Card in most cases |
| **PayPal** | PAYPAL sheet | Small, declining use — Discogs, DJ gear, Scentbird/Hulu/Tidal subs (2020–2022 mostly) |
| **NEBAT** | NEBAT sheet | Hub account — income deposits, bill pay, Apple Card payments, home loan |
| **Other via NEBAT** | Withdrawal tags | Home Loan, Wells Fargo, Social Security (out), Car Insurance, Helium, utilities |

### Income sources (NEBAT deposits, all time)

| Source | Total |
|--------|------:|
| Agnesian (payroll) | $140,702 |
| Social Security | $39,416 |
| Unlabeled transfers | $26,568 |
| Tax Refund | $19,949 |
| Star | $12,971 |
| Empower (401k/retirement?) | $9,694 |
| Refinance | $7,059 |
| Stimulus | $3,200 |

**Total deposits recorded:** $260,466

### Data integrity notes

1. **Do not double-count Amazon.** Apple Card `Amazon` category ($42,501) and the AMAZON sheet ($45,646) describe the same ecosystem — the sheet is line-item detail, not additive spend.
2. **Category naming is inconsistent.** Examples: `Music` vs `Music eq` vs `Music Eq`; `SUB _ Scentbird` vs `SUB - Scentbird`; `Software - ChatGPT` vs `AI - ChatGPT`.
3. **NEBAT withdrawal totals include signed reversals** (negative withdrawal rows for subscription refunds/credits), which distorts simple sums.
4. **PIVOT Grand Total for Apple (2026 filter) shows $347** because a **Payment** row of −$16,850 offsets YTD purchases — the pivot is net, not gross spend.

---

## 2. Spending Analysis

### Primary spend base: Apple Card

**Gross purchases (positive amounts, excluding Payment/Credit/Debit):** **$216,835**  
**Period:** Jan 2020 – Jun 2026 (~6.4 years)  
**Annual average:** ~$33,900/yr

### Annual Apple Card spending

| Year | Spend |
|------|------:|
| 2020 | $19,402 |
| 2021 | $30,355 |
| 2022 | $32,253 |
| 2023 | $35,306 |
| 2024 | $39,731 |
| 2025 | $42,445 |
| 2026 YTD | $17,343 |

Spending trend: **+119% from 2020 to 2025** (steady climb).

### All Apple Card categories — ranked

| Rank | Category | Amount | % of total |
|------|----------|-------:|----------:|
| 1 | Amazon | $42,501 | 19.6% |
| 2 | Personal | $37,407 | 17.3% |
| 3 | Grocery | $23,326 | 10.8% |
| 4 | Power and Light | $16,969 | 7.8% |
| 5 | Home | $15,981 | 7.4% |
| 6 | Restaurants | $9,721 | 4.5% |
| 7 | Telephone | $9,197 | 4.2% |
| 8 | Computer | $5,595 | 2.6% |
| 9 | Internet | $4,759 | 2.2% |
| 10 | Spa | $4,669 | 2.2% |
| 11 | Gas | $4,564 | 2.1% |
| 12 | Audio Eq | $3,970 | 1.8% |
| 13 | Lighting Eq | $3,294 | 1.5% |
| 14 | Water Utility | $3,197 | 1.5% |
| 15 | Medical | $2,346 | 1.1% |

*118 distinct categories total.*

### Consolidated decision buckets (Apple Card)

| Bucket | Amount | % |
|--------|-------:|--:|
| Amazon & shopping (Amazon + Personal + Shopping) | $80,396 | 37.1% |
| Utilities (power, water, internet, phone, gas, helium) | $42,411 | 19.6% |
| Food (grocery + restaurants) | $33,046 | 15.2% |
| Housing & home | $17,856 | 8.2% |
| DJ / AV equipment | $10,916 | 5.0% |
| Computer & software | $10,230 | 4.7% |
| Entertainment & streaming | $7,915 | 3.7% |
| Vehicle | $5,134 | 2.4% |
| Retroverse production (3D print, engraving, inventory) | $4,059 | 1.9% |
| AI tools | $2,304 | 1.1% |
| Medical | $2,346 | 1.1% |

### Recurring vs one-time (heuristic)

| Type | Amount | % |
|------|-------:|--:|
| Utilities & streaming (power, phone, YouTube TV, etc.) | $45,174 | 20.8% |
| Explicit subscriptions / software / AI / web | $9,238 | 4.3% |
| One-time & discretionary (everything else) | $162,424 | 74.9% |

**Estimated recurring burn (subs + utilities):** ~$54,400 over 6.4 years → **~$710/mo** average.

Top recurring lines (estimated monthly):

| Service | Lifetime total | ~Monthly |
|---------|---------------:|---------:|
| YouTube TV (`SUB - TV`) | $1,199 | $36 |
| YouTube Premium (`SUB - YouTube`) | $1,012 | $24 |
| ChatGPT (both categories combined) | $1,035 | $45 |
| Netflix | $411 | $22 |
| Adobe (both categories) | $854 | $14 |
| Grok (annual charge) | $517 | $43* |
| AppleCare | $251 | $28 |
| Cursor | $225 | $38 |
| iCloud (both categories) | $416 | $12 |

\*Grok $516.95 appears to be a single annual charge in 2025, not monthly.

---

## 3. AI & Technology Analysis

### AI-related spend (Apple Card, all vendors)

**Lifetime total:** **$2,304** (1.1% of Apple Card spend)  
**Monthly average (full span):** $35/mo  
**Annual average:** ~$360/yr  

### By year (accelerating)

| Year | AI spend |
|------|--------:|
| 2022 | $20 |
| 2023 | $148 |
| 2024 | $333 |
| 2025 | $775 |
| 2026 YTD (5 mo) | **$1,028** |

**2026 run rate:** ~$2,470/yr if pace continues — **7× the historical average**.

### Every AI vendor found

| Vendor / category | Total | Txns | Notes |
|-------------------|------:|-----:|-------|
| Software - ChatGPT | $712 | 31 | Primary OpenAI billing (~$21/mo pattern) |
| SUB - Grok | $517 | 1 | Single large charge — likely annual xAI subscription |
| AI - ChatGPT | $322 | 11 | Overlaps with Software - ChatGPT — same vendor |
| AI - Cursor | $225 | 10 | ~$20/mo, active through Jun 2026 |
| AI - Youmind | $100 | 6 | $16–20/mo bursts — evaluate usage |
| AI - Genspark | $99 | 3 | Trial churn pattern |
| AI - Creative Fabrica | $94 | 2 | May 2026 only |
| AI - Abacus | $60 | 4 | Jan–Mar 2026 |
| AI - Runpod.io | $45 | 2 | GPU cloud — Mar 2026 |
| AI - Vercel | $40 | 2 | Hosting, not strictly AI |
| AI - Grok | $30 | 1 | Separate from SUB - Grok |
| SUB - GenSpark Ai | $26 | 1 | Duplicate vendor with AI - Genspark |
| Software - Midjourney | $20 | 2 | Inactive since early use |
| AI - Gemini | $13 | 2 | Minimal |
| Software - KITTL + SUB - Kittle | $240 | 4 | Design AI — duplicate categories |
| Software - Figma | $20 | 1 | One-time |

### Not found in workbook

- **Claude / Anthropic** — no transactions
- **OpenRouter** — no transactions
- **Replicate, Perplexity, Copilot, ElevenLabs, Runway** — no transactions

### Overlapping / duplicate subscriptions — review list

| Issue | Categories | Combined | Action |
|-------|-----------|----------:|--------|
| ChatGPT double-booked | `Software - ChatGPT` + `AI - ChatGPT` | $1,035 | Consolidate to one category; confirm one subscription |
| Adobe double-booked | `Software - Adobe` + `SUB - Adobe` | $854 | Likely CC + subscription — verify plan count |
| KITTL double-booked | `Software - KITTL` + `SUB - Kittle` | $240 | Same vendor, two tags |
| Creative Fabrica | `AI - Creative Fabrica` + `SUB - CreativeFabrica` | $141 | Overlap |
| GenSpark | `AI - Genspark` + `SUB - GenSpark Ai` | $125 | Overlap |
| Dropbox | `Storage - Dropbox` + `SUB - Dropbox` | $180 | Same service |
| Cloudflare | `Web - Cloudflare` + `SUB - CloudFlare` | $91 | Same service |
| iCloud | `Software - iCloud` + `Storage - iCloud` | $416 | Same service |
| Grok | `SUB - Grok` ($517) + `AI - Grok` ($30) | $547 | Confirm one xAI account |

### Possibly unused / churned AI tools

| Tool | Last activity | Total | Flag |
|------|--------------|------:|------|
| Midjourney | 2023 | $20 | Dormant |
| Figma | 2024 | $20 | One-time |
| Gemini | Apr 2026 | $13 | Minimal investment |
| Abacus | Mar 2026 | $60 | Short burst — still active? |
| Youmind | May 2026 | $100 | Recurring — validate value |
| Genspark | May 2026 | $125 | Trial + sub — overlap risk |
| Creative Fabrica | May 2026 | $141 | New — evaluate |
| Runpod | Mar 2026 | $45 | Sporadic GPU — compare to local hardware |

### Local AI hardware question

| Metric | Value |
|--------|-------|
| Lifetime AI spend | $2,304 / 6.4 yr |
| 2025 AI spend | $775 |
| 2026 projected | ~$2,470/yr |
| % of total Apple spend | 1.1% lifetime; **~5.9% at 2026 run rate** |

**Verdict:** At historical spend (~$360/yr), local GPU hardware is **not justified** on cost alone. At the **2026 run rate (~$2,500/yr)** plus Runpod usage, a **break-even analysis is reasonable** if Cursor + ChatGPT + GPU cloud continue growing. A used Mac Studio or single RTX 4090 box (~$2,000–3,500) pays back in 12–18 months at current trajectory — but only if local models replace cloud subscriptions, not add to them.

---

## 4. Retroverse Analysis

Retroverse spend is not tagged as a single category. Estimated from production-related categories + web hosting + AI dev tools + Amazon equipment accounts.

### Apple Card — Retroverse-adjacent categories

| Category | Total | Role |
|----------|------:|------|
| Computer | $5,595 | Dev machine upgrades |
| Audio Eq | $3,970 | DJ / show equipment |
| Lighting Eq | $3,294 | Show equipment |
| Engraving | $2,248 | Physical production |
| Computer - MacBook Pro | $1,981 | Primary dev hardware (2025) |
| OWI | $1,669 | Audio |
| Video Eq | $1,030 | Video / show |
| 3D Printing | $972 | Passes, physical goods |
| Inventory | $839 | Media / production supplies |
| Web - Plex | $74 | Media server |
| Storage - Dropbox / iCloud | $190 | File sync |
| Web - Cloudflare / Netlify / Neon | $87 | **Retroverse hosting stack** |
| AI - Cursor, ChatGPT, Vercel, Runpod | $632 | **Dev infrastructure** |
| Software - Hazel, Lossless Cut | $62 | Media tooling |

**Apple Card Retroverse estimate (broad):** $23,040 lifetime / **~$3,600/yr**

### Amazon — equipment & production accounts

| Account | Total |
|---------|------:|
| Audio Eq | $3,836 |
| Computer | $3,027 |
| Video Eq | $2,090 |
| inventory | $1,775 |
| Office (printer, paper) | $1,189 |
| Music eq | $920 |
| Lighting Eq | $866 |

**Notable 2024–2025 Retroverse purchases:**
- OUPES 2400W portable power station — $801 (2025)
- Epson EcoTank ET-8550 photo printer — $738 (2025)
- Home Assistant Green hub — $157 (2025)
- Deco X6 mesh WiFi — $148 (2025)
- DJ laser lights, USB drives, cable bags, mini projector

### Annual Retroverse operating cost estimate

| Component | 2023+ avg/yr |
|-----------|------------:|
| Apple production categories + web + AI dev | ~$2,500 |
| Amazon equipment/inventory/office | ~$1,540 |
| **Estimated annual ops** | **~$4,040** |

| Year | Retroverse total (Apple + Amazon equip) |
|------|---------------------------------------:|
| 2022 (build-out year) | $12,908 |
| 2023 | $8,162 |
| 2024 | $2,451 |
| 2025 | $3,014 |
| 2026 YTD | $2,536 |

**2022 was a capital spike** (equipment build-out). Steady-state ops appear to be **$2,500–4,000/yr** excluding major hardware refreshes.

### Retroverse cost breakdown (steady state)

| Area | ~Annual |
|------|--------:|
| AI dev tools (Cursor, ChatGPT, Vercel, Runpod) | $600–2,500 (rising) |
| Hosting (Cloudflare, Neon, Netlify) | $15–90 |
| Media/software (Plex, Dropbox, Hazel, Lossless Cut) | $50–200 |
| 3D printing & engraving | $100–500 |
| Printing (EcoTank supplies, paper) | $200–800 |
| DJ/show equipment (ongoing) | $0–1,500 (lumpy) |
| Domains | Not visible in workbook — may be in Cloudflare sub |

---

## 5. Household Analysis

*Apple Card only. NEBAT covers mortgage and insurance separately.*

| Area | Categories | Total | % |
|------|-----------|------:|--:|
| **Housing** | Home, repairs, installments | $17,856 | 8.2% |
| **Utilities** | Power, water, internet, phone, gas, helium | $42,411 | 19.6% |
| **Vehicle** | Gas, truck | $5,134 | 2.4% |
| **Insurance** | Flood insurance, AppleCare | $1,178 | 0.5% |
| **Medical** | Medical | $2,346 | 1.1% |
| **Food** | Grocery, restaurants | $33,046 | 15.2% |
| **Personal** | Personal, spa, shopping | $42,563* | — |

\*Personal bucket overlaps with Amazon shopping — treat as lifestyle/discretionary, not strictly household.

### NEBAT household items (not in Apple Card)

| Item | NEBAT withdrawals |
|------|------------------:|
| Home Loan | $19,256 |
| Car Insurance | $1,423 |
| Wells Fargo (transfers) | $2,220 |
| Apple Card payments | $74,607 (transfers, not new spend) |

---

## 6. Executive Summary

### Where is the money actually going?

1. **Amazon + general shopping** — 37% of Apple Card ($80k)  
2. **Utilities** — 20% ($42k) — power, phone, internet dominate  
3. **Food** — 15% ($33k)  
4. **Housing-related** — 8% on-card + $19k home loan via NEBAT  
5. **DJ/AV hobby + Retroverse equipment** — 5–7% combined  
6. **AI tools** — 1% lifetime, **~6% at 2026 pace**

Income flows through NEBAT (Agnesian payroll + Social Security). Apple Card is the spending surface. Amazon sheet provides receipt-level detail.

### Top 10 spending categories (Apple Card, raw)

1. Amazon — $42,501 (19.6%)
2. Personal — $37,407 (17.3%)
3. Grocery — $23,326 (10.8%)
4. Power and Light — $16,969 (7.8%)
5. Home — $15,981 (7.4%)
6. Restaurants — $9,721 (4.5%)
7. Telephone — $9,197 (4.2%)
8. Computer — $5,595 (2.6%)
9. Internet — $4,759 (2.2%)
10. Spa — $4,669 (2.2%)

### Surprises

1. **Spa: $4,669** — larger than most tech categories; 2025 alone was $4,431.
2. **AI spend explosion in 2026** — $1,028 in 5 months vs $775 all of 2025.
3. **Grok $517** — single charge, 67% of 2025 AI spend in one line.
4. **MacBook Pro $1,981** — 2025 hardware refresh (Retroverse + personal).
5. **Amazon is 20% of all card spend** but lacks category drill-down without the AMAZON sheet.
6. **Many duplicate category tags** — reporting is harder than it needs to be.
7. **PayPal largely abandoned** — only $3k lifetime, nothing recent except Dec 2025.

### Subscriptions to review

| Priority | Subscription | Why |
|----------|-------------|-----|
| High | ChatGPT (dual categories) | $1,035 combined — confirm tier, stop double-tagging |
| High | Grok ($517) | Annual xAI — validate vs ChatGPT overlap |
| High | YouTube TV + YouTube Premium | $2,211 combined — two Google video subs |
| Medium | Cursor ($225+) | Active — core Retroverse tool, keep |
| Medium | Youmind, Genspark, Abacus, Creative Fabrica | Churn cluster — pick one or cut |
| Medium | Adobe ($854) | Check if Creative Fabrica/KITTL replace it |
| Medium | KITTL ($240) | Duplicate tags |
| Low | Midjourney ($20) | Already dormant |
| Low | Scentbird, Peacock, Paramount+ | Small streaming — audit against usage |
| Low | Dropbox + iCloud + Cloudflare | Three storage/CDN layers — intentional? |

### Local AI hardware?

**Not yet at historical spend.** **Worth modeling now** if 2026 AI trajectory holds ($2,500+/yr). Decision hinge: would local inference **replace** ChatGPT + Runpod + multiple experimental subs, or **add** a new cost line?

---

## Appendix: PIVOT sheet snapshot (as of workbook save)

The PIVOT tab shows **year-filtered** summaries:

- **Apple 2026 YTD:** AI tools active (Cursor, ChatGPT, Grok, Runpod, Vercel, Creative Fabrica, etc.), utilities, grocery, 3D printing ($972)
- **Amazon 2025:** $10,458 total — Personal $7,778 dominates
- **NEBAT 2025:** Withdrawals −$12,246 / Deposits $12,174 (filtered subset, not full year)
- **PayPal 2025:** $503 — Canva, Office 365, Tune My Music

---

*Audit complete. No workbook data was modified.*
