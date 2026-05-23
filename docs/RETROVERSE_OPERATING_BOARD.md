# Retroverse Operating Board

**Purpose:** Live status and priorities for RETROVERSE_PUBLIC + coordinated welcome work.  
**Updated:** 2026-05-23

---

## Status Board

| Workstream | Status |
|------------|--------|
| Songs section stabilization (v1) | **DONE** — locked |
| RV History on search (year modes, month-first, snapshots) | **DONE** — do not restyle |
| Search Results Experience v1 polish | **PAUSED** — superseded by architecture below |
| Search Intent Interceptor (architecture) | **LOCKED** — not implemented yet |

---

## Songs stabilization — DONE (v1 locked)

- Songs section stabilized
- 3-card stack locked
- Full-width active song card established
- Right-side action buttons implemented
- Typography hierarchy improved
- Horizontal song rail removed
- Experimental reel/slot-machine systems removed

**Implementation anchors (PUBLIC):**

- `app/search/components/search-songs-jukebox-panel.tsx`
- `app/components/songs-jukebox-reel.tsx`
- `app/components/songs-jukebox.css`
- `app/search/search.css` (Songs panel only)

### Songs Section v1 = LOCKED

Do **not** redesign again unless:

- track pages exist
- playlist systems exist
- mobile search flow fully stable

Further work: tiny spacing polish, metadata tuning, track routing hookup — **not** architecture changes.

---

## Search Intent Interceptor — ARCHITECTURE LOCKED

**Status:** Approved architecture. **No code implementation yet.** Lock before continuing search work.

### Problem (why current search is unstable)

Search behavior is inconsistent because the search page tries to **interpret, expand, rank, and display** at the same time.

| Failure mode | Example |
|--------------|---------|
| Alias inconsistency | `beatles` ≠ `the beatles` |
| Chronology vs relevance | ordering fights itself |
| Ambiguous intent | artist vs song vs album vs year |
| Noisy broad queries | `prince`, `78`, `thriller`, `hotel california` |
| Overloaded `/search` | one page does everything |

Current `/search` is becoming unstable. **Do not add more logic there until the interceptor exists.**

### Approved flow (3 steps)

```
Homepage query
    → STEP 1: Search interpretation
    → STEP 2: User choice (one tap)
    → STEP 3: Immersive results page (fully contextual)
```

**Principle:** Interpret intent **first**. Render immersive results **second**.

#### Step 1 — Search interpretation (homepage)

After **2+ characters**, homepage reveals grouped candidates (not a single blended results dump):

| Group | Examples for `beatles` |
|-------|-------------------------|
| Artists | THE BEATLES |
| Albums | Beatles '65 |
| Songs | Hey Jude |
| Years | 1968 |

Simple grouped pills/cards. **Editorial, collectible, intentional** — not Google/Spotify/SaaS autocomplete.

#### Step 2 — User choice

User taps **one** resolved target (artist, album, song, or year).

#### Step 3 — Immersive results

Route to a **fully contextual** search results experience with intent already resolved.

- No simultaneous reinterpretation on load
- RV History, Songs, Albums behave per locked entity context

### Chronology rule (entity experiences)

When inside **artist / song / album** pages (and entity-scoped immersive search):

| Use | Do not use |
|-----|------------|
| **First appearance date** | relevance score |
| stable editorial order | fuzzy rank fighting chronology |

Chronology **dominates** inside entity experiences.

### Search result rule (broad vs scoped)

| Context | Ordering |
|---------|----------|
| Broad / interpretation step | Relevance allowed |
| Inside entity / after user choice | Chronology dominates (first appearance) |

### What this is NOT

- Not modern autocomplete
- Not relevance-ranked infinite scroll on homepage
- Not more patches to monolithic `/search` query handling

### Initial implementation target (when approved to build)

1. Homepage: after 2 chars → top artists, albums, songs, years (grouped)
2. Tap → route with resolved intent
3. Then load immersive results page (existing panels where applicable)

**Until implementation is explicitly approved:** no interceptor UI, no routing refactor, no search ranking rewrite.

### Current search page (interim)

`/search` may retain RV History modes, Songs stack, and year-aware RV History **as built** — but **do not** extend monolithic search interpretation logic on that page. Treat it as interim until interceptor ships.

---

## RV History on search — DONE (do not restyle)

- Generic entry vs year-aware full module
- Month-first navigation, #1 week snapshots
- Hot 100 / Album 200 split sections
- Year-scoped data load (no LIMIT truncation on months)

**Do not:** redesign RV History styling, rebuild Songs, or change interaction flow without a new board entry.

---

## Next priority (after architecture approval)

### Search Intent Interceptor — implementation v1

Build Steps 1–3 on homepage + routing only. Reuse immersive results; do not redesign Songs or RV History chrome.

---

## Do not (current phase)

- implement Search Intent Interceptor in code (architecture lock only — this update)
- redesign homepage layout beyond interceptor spec when build starts
- touch Songs architecture or styling
- rebuild RV History styling
- add experimental search interaction models
- patch alias/chronology/relevance fights inside monolithic `/search` without interceptor

---

## Related docs

- [RETROVERSE_PROJECT_CONTEXT.md](./RETROVERSE_PROJECT_CONTEXT.md)
- `.cursor/rules/retroverse-design.mdc`
- `.cursor/rules/retroverse-data.mdc`
