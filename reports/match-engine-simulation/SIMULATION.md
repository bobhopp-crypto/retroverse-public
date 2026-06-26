# Match Engine Simulation — Entire VIDEO Library

**Scanned:** 2026-06-24T04:23:14.558Z  
**Simulation only** — no label writes, no database.xml changes.

---

## Inventory

| Metric | Count |
|--------|------:|
| Total VIDEO files | 8,837 |
| Assigned (RVTR label) | 8,476 |
| Unresolved (no RVTR) | 361 |

---

## Current state (existing labels + legacy scoring)

| Bucket | Count | % |
|--------|------:|--:|
| Exact | 3936 | 44.5% |
| High | 234 | 2.6% |
| Medium | 4283 | 48.5% |
| Low | 9 | 0.1% |
| Suspicious | 14 | 0.2% |
| Unresolved (no label) | 361 | 4.1% |

---

## Simulated state (new engine — artist catalog + title containment + identity preference)

| Bucket | Count | % | Δ vs current |
|--------|------:|--:|--:|
| Exact | 4772 | 54% | +836 |
| High | 21 | 0.2% | -213 |
| Medium | 3409 | 38.6% | -874 |
| Low | 152 | 1.7% | +143 |
| Suspicious | 430 | 4.9% | +416 |
| Unresolved | 53 | 0.6% | -308 |

---

## Impact summary

| Metric | Count |
|--------|------:|
| **Bucket improved** | **1199** |
| Bucket degraded | 561 |
| Unchanged | 7077 |
| **Reassignment opportunities** (auto-worthy, different RVTR) | **781** |
| **VDJ → canonical identity** | **870** |
| Chart/canonical identity (assigned labels today) | 4214 |
| Chart/canonical identity (simulated) | 4945 (+731) |
| Current review-tier (medium) | 4283 |
| Simulated review-tier | 3409 |
| **Review → auto (disappeared)** | **774** |
| **Unresolved → matchable** (medium+) | **143** |
| **Unresolved → auto-match** (exact/high) | **108** |
| Simulated would remain unassigned (no auto/review) | 635 |

---

## Reassignment sample (top confidence)

- **Alan Jackson, Jimmy Buffett — It's Five O' Clock Somewhere** · `RVTR853965` (vdj) → `RVTR835994` (hot100) · 100% · exact
- **The Animals — Please Don't Let Me Be Misunderstood  (Color)** · `RVTR619129` (vdj) → `RVTR147877` (hot100) · 100% · exact
- **Taylor Swift, Alison Krauss, Vince Gill — Red (Cma Awards)** · `RVTR254821` (vdj) → `RVTR430067` (hot100_vdj) · 100% · exact
- **The Singing Nun — Dominique & Les Pieds Des Missionnaires** · `RVTR116789` (vdj) → `RVTR779789` (hot100) · 100% · exact
- **Tyga Ft. Cedric Gervais, Wiz Khalifa & Mally Mall — Molly** · `RVTR846930` (vdj) → `RVTR028931` (hot100) · 100% · exact
- **Weezer — If Youre Wondering If I Want You To I Want You To** · `RVTR138973` (vdj) → `RVTR097473` (hot100) · 100% · exact
- **Marvin Gaye & Tammi Terrell — Ain't No Mountain High Enough** · `RVTR592535` (vdj) → `RVTR058876` (hot100) · 100% · exact
- **Climie Fisher — Love Changes Everything (Extended Version)** · `RVTR137934` (vdj) → `RVTR624801` (hot100) · 100% · exact
- **Blake Shelton Ft. Pistol Annies & Friends — Boys 'Round Here** · `RVTR617029` (vdj) → `RVTR993009` (hot100) · 100% · exact
- **A$AP Rocky Ft. Skrillex & Birdy Nam Nam — Wild For The Night** · `RVTR068252` (vdj) → `RVTR662430` (hot100) · 100% · exact
- **The Doobie Brothers — China Grove/Listen To The Music (Live)** · `RVTR459954` (vdj) → `RVTR892750` (hot100) · 100% · exact
- **Elton John — Goodbye Yellow Brick Road(Muppet Show 1977)** · `RVTR852528` (vdj) → `RVTR483649` (hot100_vdj) · 100% · exact

---

## Newly matchable (was unresolved)

- **Florida Georgia Line — This Is How We Roll ft. Luke Bryan** → `RVTR454779` (hot100_vdj) · exact · 100%
- **Mark Ronson — Nothing Breaks Like A Heart  Ft. Miley Cyrus** → `RVTR853156` (hot100) · exact · 100%
- **Blake Shelton — Boys 'Round Here Ft. Pistol Annies & Friends** → `RVTR993009` (hot100) · exact · 100%
- **Mitch Ryder & The Detroit Wheels — Jenny Take A Ride : C C Rider** → `RVTR360336` (vdj) · medium · 90%
- **Neil Diamond — Forever In Blue Jeans , Im A Believer , America  (2008)** → `RVTR297395` (hot100_vdj) · exact · 100%
- **Calvin Harris — Feels  Ft. Pharrell Williams, Katy Perry, Big Sean** → `RVTR514038` (hot100_vdj) · exact · 100%
- **Louis Tomlinson — Back To You  Ft. Bebe Rexha, Digital Farm Animals** → `RVTR098355` (hot100_vdj) · exact · 100%
- **Will Ferrell & The Channel 4 News Team — Afternoon Delight (Anchorman)** → `RVTR628729` (vdj) · low · 68%
- **Ne Yo — Mad** → `RVTR528402` (hot100_vdj) · exact · 100%
- **B.O.B. — Magic** → `RVTR745594` (hot100_vdj) · exact · 100%

---

## Scoring model

1. **Artist first** — compact key, limit to artist catalog
2. **Title containment** — canonical title key contained in video title key → 100%; partial = matched chars ÷ canonical length
3. **Canonical title source** — `normalized_title_key` / graph title (avoids Feat corruption in display title)
4. **Identity preference** — hot100 → hot100_vdj → other → vdj

---

## Outputs

- `simulation-summary.json`
- `reassignment-opportunities.csv`
