# Finance UX Cleanup Pass

**Date:** 2026-06-16  
**Scope:** Readability, density, workflow only — no new accounting features.

## Screens changed

| Screen | Component(s) |
|--------|----------------|
| Finance Home | `FinanceSpendingHome`, `FinanceSpendingChart`, `FinanceSpendingDrilldown` (new) |
| NEBAT account | `FinanceAccountDetail`, `FinanceNebatRegister`, `FinanceAccountRegisterSummary` |
| Apple Card account | `FinanceAppleCardAccount`, `FinanceAppleCardRegister` |
| Shared styles | `app/ops/finance/finance-ops.css` |

## Routes affected

| Route | Change |
|-------|--------|
| `/ops/finance` | Cash/debt/net snapshot, metrics above chart, taller chart, category drill-down, compact account table |
| `/ops/finance/accounts/nebat-checking` | Statement header → history → register (checkbook layout) |
| `/ops/finance/accounts/apple-card` | Statement balance / min due / due date → history → register |
| `/ops/finance/accounts/*` | Same detail pattern for mortgage, 401(k), savings, PayPal |

## Screenshots

All in `reports/finance/ux-pass/`:

| File | Description |
|------|-------------|
| `before-home-desktop.png` | Prior home (pre-pass reference) |
| `home-desktop.png` | After — desktop home |
| `home-mobile.png` | After — mobile home |
| `home-groceries-drill-desktop.png` | Category drill-down (merchants + recent txns) |
| `nebat-desktop.png` / `nebat-mobile.png` | NEBAT register |
| `apple-desktop.png` / `apple-mobile.png` | Apple Card register |

Re-capture: `RETROVERSE_OPS=1 npx tsx tools/finance/capture-finance-ux-pass.ts` (dev server on :3001).

## Remaining UX issues

1. **401(k) / savings / PayPal** — still manual setup or sparse data; rows show “Not set up” until balances entered.
2. **Register post-statement only** — opening row shows statement balance; activity after anchor only (by design, not full statement-period register).
3. **Apple payments in register** — payment rows still sparse in ledger (CSV skips payments); register may not roll forward to match next statement.
4. **Import center** — unchanged; still ops-oriented (acceptable for admin path).
5. **Statement validation route** — still linked from ops nav; not surfaced on home (good) but page copy could be simplified in a future pass.
6. **Mobile category buttons** — wrap to 2 columns; “More…” select is functional but less tactile than primary buttons.
