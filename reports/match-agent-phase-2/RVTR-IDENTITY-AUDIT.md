# RVTR Identity Audit — Match Agent Auto-Matched (1067)

**Source:** `reports/match-agent-phase-2/2026-06-24T01-28-05-401Z/` (live run, 1,067 labels written)

Read-only. No assignments modified.

---

## Counts by identity_source

| identity_source | Count | % | Layer |
|-----------------|------:|--:|-------|
| `vdj` | 877 | 82.2% | VDJ-generated local identity |
| `hot100` | 80 | 7.5% | Canonical chart song |
| `hot100_vdj` | 110 | 10.3% | Chart song + VDJ media link |
| missing | 0 | 0% | — |

**Canonical chart layer (`hot100` + `hot100_vdj`):** 190 (17.8%)

---

## Wrong-layer: VDJ identity when chart canonical exists

Of **877** assignments to `identity_source = vdj`:

| Finding | Count | % of vdj-assigned |
|---------|------:|------------------:|
| Chart canonical exists (exact graph title match) | **42** | **4.8%** |
| Chart canonical exists (file base title, suffix stripped) | **210** | **23.9%** |
| **Total wrong-layer (union)** | **252** | **28.7%** |
| VDJ-only (no chart sibling found) | 625 | 71.3% |
| Tier **A** wrong-layer (exact match bucket) | **25** | 2.9% |

Suffix variants (Color, BW, Extended) assigned to `vdj` rows whose graph title includes the suffix — canonical chart RVTR exists for the base song title from the filename.

- **Climie Fisher — Love Changes Everything (Extended Version)** → `RVTR137934` (vdj: "Love Changes Everything Extended Version") · chart `RVTR624801` (Love Changes Everything, #23) · tier A
- **Elton John — Goodbye Yellow Brick Road(Muppet Show 1977)** → `RVTR852528` (vdj: "Goodbye Yellow Brick Road Muppet Show 1977") · chart `RVTR483649` (Goodbye Yellow Brick Road, #2) · tier A
- **The Temptations — The Way You Do The Things You Do (Acapella)** → `RVTR117258` (vdj: "The Way You Do The Things You Do Acapella") · chart `RVTR593043` (The Way You Do The Things You Do, #11) · tier A
- **The Rolling Stones — You Can't Always Get What You Want  (2013)** → `RVTR217359` (vdj: "You Can'T Always Get What You Want 2013") · chart `RVTR769450` (You Can'T Always Get What You Want, #42) · tier A
- **The Kinks — You Really Got Me (Sexiest Babes of 60's Television)** → `RVTR482329` (vdj: "You Really Got Me Sexiest Babes Of 60'S Television") · chart `RVTR483903` (You Really Got Me, #7) · tier A
- **Britney Spears — Hold It Against Me (Promo Only No Break Edit*)** → `RVTR060043` (vdj: "Hold It Against Me Promo Only No Break Edit") · chart `RVTR946203` (Hold It Against Me, #1) · tier A
- **Chambers Brothers — Time Has Come Today (Live extended version)** → `RVTR491222` (vdj: "Time Has Come Today Live Extended Version") · chart `RVTR514782` (Time Has Come Today, #11) · tier A
- **The Foundations — Build Me Up Butter Cup (Something About Mary)** → `RVTR284047` (vdj: "Build Me Up Butter Cup Something About Mary") · chart `RVTR136699` (Build Me Up Buttercup, #3) · tier A

---

## Artist/title inversions (filename vs graph)

**2** assignments where VDJ filename artist/title appears swapped vs assigned graph metadata.

---

## Root cause

`loadMatchCandidates()` queries `canonical_track_display` with **no `identity_source` filter**. Tier A exact match on normalized title+artist prefers rows whose titles **include VDJ filename suffixes** (Color, Extended, Live, BW, PO Edit) — typically `identity_source = vdj` rows minted from local files, not the Hot 100 canonical.

---

## Examples — VDJ assigned, chart canonical exists

- **The B-52's — Roam** → assigned `RVTR307366` (vdj) · chart canonical `RVTR539573` (Roam, peak #3) · tier B
- **KLF — 3 A.M. Eternal** → assigned `RVTR461306` (vdj) · chart canonical `RVTR633543` (3 A M Eternal, peak #5) · tier A
- **Dan & Shay — 10,000 Hours** → assigned `RVTR040912` (vdj) · chart canonical `RVTR848359` (10 000 Hours, peak #4) · tier A
- **D Angelo — Brown Sugar** → assigned `RVTR414062` (vdj) · chart canonical `RVTR027013` (Brown Sugar, peak #27) · tier B
- **'NSYNC — It's Gonna Be Me** → assigned `RVTR392640` (vdj) · chart canonical `RVTR668403` (It'S Gonna Be Me, peak #1) · tier B
- **Killers — Mr. Brightside** → assigned `RVTR843135` (vdj) · chart canonical `RVTR989769` (Mr Brightside, peak #10) · tier A
- **J Geils Band — Centerfold** → assigned `RVTR231490` (vdj) · chart canonical `RVTR145789` (Centerfold, peak #1) · tier B
- **J Geils Band — Love Stinks** → assigned `RVTR295043` (vdj) · chart canonical `RVTR737964` (Love Stinks, peak #38) · tier B
- **J Geils Band — Freeze Frame** → assigned `RVTR454258` (vdj) · chart canonical `RVTR752304` (Freeze Frame, peak #4) · tier B
- **3 Doors Down — When I m Gone** → assigned `RVTR533227` (vdj) · chart canonical `RVTR694462` (When I'M Gone, peak #4) · tier A
- **Stray Cats — (She s) Sexy & 17** → assigned `RVTR343285` (vdj) · chart canonical `RVTR194343` (She'S Sexy 17, peak #5) · tier B
- **Rick Nelson — It s Up To You** → assigned `RVTR552366` (vdj) · chart canonical `RVTR896029` (It'S Up To You, peak #6) · tier A
- **Blink 182 — Whats My Age Again** → assigned `RVTR105695` (vdj) · chart canonical `RVTR750527` (What'S My Age Again, peak #58) · tier B
- **Queen — You re My Best Friend** → assigned `RVTR134032` (vdj) · chart canonical `RVTR084326` (You'Re My Best Friend, peak #16) · tier A
- **Godsmack — Cryin  Like A Bitch** → assigned `RVTR878081` (vdj) · chart canonical `RVTR801046` (Cryin' Like A Bitch, peak #74) · tier A

---

## Recommendation

Prefer `identity_source IN ('hot100', 'hot100_vdj')` in match ranking when a chart canonical exists for the same normalized artist+title. Deprioritize or exclude `identity_source = vdj` when a chart sibling exists.

---

## Outputs

- `rvtr-identity-audit.json`
- `wrong-layer-conflicts.csv`
