# Browser Plus 3.0 — Screen-by-Screen Terminology Inventory

Post Phase A visible language. Internal code names (`SongPackage`, `deckStatus`, `storyCards`) unchanged.

---

## `/ops/browser-plus-2` — Browser Plus 3.0

| Element | Label |
|---|---|
| Title | Browser Plus 3.0 |
| Subtitle | Song · Research · Experience |
| Breadcrumb | Browser Plus › Song |
| Summary metrics | Active Videos, Identified, Processed, Unidentified, Experience Ready |
| Filters (sidebar) | All Videos, Unidentified, Identified, Processed, Legacy, Missing Cover, Missing Metadata, Missing Story, Experience Ready, Top Played, Recently Added |
| Inspector header | Year, RVTR, Status (Legacy not Processed Legacy), Plays, Last played, Research score, Experience score |
| Story | Human-readable blurbs only (no vault excerpts) |
| Research Summary | Facts, Stories, Sources, Artifacts, Last updated, Research status, Experience ready, Coverage |
| Actions | Open Song, Open Research, Open in Live View, Copy RVTR |
| VirtualDJ | Label, Grouping, RV Tags, File path, Plays, First seen, Last played |
| Data Repair | Metadata Recovery (conditional, footer) |

**Removed from UI:** Open Package, Regenerate Package, Open Video placeholders, VDJ Label in header, summary chips duplicating filters.

---

## `/ops/intelligence` — Research Center

| Before | After |
|---|---|
| Package Center | Research Center |
| Package health at a glance | Research coverage at a glance |
| Package Exists | Has Research |
| Missing Package | No Research |
| Generate Packages | Generate Research |
| Package Status | Research Status |
| Package Ready | Research Ready |

---

## `/ops/intelligence/package/[rvtr]` — Song Research

| Before | After |
|---|---|
| Song Package | Song Research |
| Package Review | Research Review |
| Research Vault (section) | Sources |
| Fact Library | Facts |
| Story Library | Story |
| Package Health | Coverage |
| Package Maintenance | Maintenance |
| Rebuild/Delete Package | Rebuild/Delete Research |
| Build Cards | Build Experience |
| Approve Package | Approve Research |

---

## `/ops/browser-plus` — Classic Browser+ (legacy)

| Before | After |
|---|---|
| PK / DK | Processed / Legacy |
| View Package | Open Research |
| View Deck | Open Song |
| Package (inspector) | Research status |
| Package Candidates | Research Candidates |
| Missing Experience | Not Experience-Ready |
| Raw Missing Package filter | No Research |

---

## Patron / Live

| Route | Label |
|---|---|
| `/retroverse-2/song/[rvtr]` | Song Experience (unchanged) |
| Live now playing PACKAGE | Open Research |
| Sunday Nights PACKAGE link | Open Research |
| `/rvtr/[rvtr]/deck` metadata | Song Experience (redirect page) |

---

## Status badge vocabulary (operator)

| Internal | Display |
|---|---|
| Processed Legacy | Legacy |
| Missing Package | No research |
| Cards Ready | Story ready |
| No Package (deckStatus) | No research |
| Not Renderable | Not experience-ready |
| Experience Ready | Experience ready |

---

## Hidden from UI (implementation detail only)

PK, DK, Deck, Performance Deck, Package Generator, Package Worker, Package Index, storyCards (as label)
