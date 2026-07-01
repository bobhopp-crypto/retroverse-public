# Gallery Render Root Cause — `/retroverse/experiences`

**Date:** 2026-06-28  
**URL:** `http://localhost:3000/retroverse/experiences?rvtr=RVTR001341`  
**Status:** Fixed — page renders successfully

---

## Summary

| Field | Value |
|---|---|
| **Failing function** | `loadGalleryLibraryProgress()` |
| **Failing file** | `lib/retroverse/gallery/load-gallery.ts` |
| **Failing lines (before fix)** | 185–201 — per-directory `await access()` / `await readFile()` loop over ~5,217 RVTR dirs |
| **Exact reason** | ~10,000+ `await` points in one async Server Component request registered ~10,000 async task nodes; Next.js RSC runtime `visitAsyncNode` recursively walked that chain until `RangeError: Maximum call stack size exceeded` |
| **Exact fix** | Replace per-directory async FS with synchronous `readdirSync` / `existsSync` / `readFileSync` in the same loop (lines 186–200) |
| **Misdiagnosis** | Prior investigation blamed `ExperienceGallery` + `useSearchParams()` because overflow always occurred immediately after `return <ExperienceGallery />`; binary isolation shows `useSearchParams` is innocent and the library scan was the trigger |

---

## Symptom

After server loader completed (~5–6s):

```
RangeError: Maximum call stack size exceeded
visitAsyncNode
visitAsyncNode
...
```

- No Retroverse frames in the repeating stack (only Next.js `app-page.runtime.dev.js`)
- Client never mounted (`ExperienceGallery` mount logs absent on failing requests)
- JSON clone of gallery payload succeeded (~6.6 KB)

---

## Binary isolation (executed 2026-06-28)

Each step: reload `?rvtr=RVTR001341`, observe HTTP + server log.

| Step | Render state | Result |
|---|---|---|
| 0 | Production tree | **FAIL** — `visitAsyncNode` overflow after page EXIT |
| 1 | `<main>Gallery Shell</main>` — no loader, no imports | **PASS** — 200 in ~2.5s |
| 2 | `await searchParams` only | **PASS** — 200 in ~130ms |
| 3 | Import `loadGalleryPageData` only (no call) | **PASS** — 200 in ~390ms |
| 4 | Call `loadGalleryPageData()` → shell text | **FAIL** — 55s timeout, overflow |
| 5 | Loader steps incrementally | See below |
| 6 | Full `ExperienceGallery`, `libraryProgress: []` | **PASS** — 200 in ~4.8s, client mounts, `useSearchParams` runs |
| 7 | Full page after sync-FS fix | **PASS** — 200 in ~3.7–5.1s, gallery renders |

### Loader step breakdown (step 5)

| Sub-step | Calls | Result |
|---|---|---|
| 5a | `loadProductionCandidateRows` + `loadSundayNightsState` | **PASS** ~3.3s |
| 5b | + `loadGallerySongContext("RVTR001341")` | **PASS** ~3.5s |
| 5c | + `loadGalleryLibraryProgress()` | **FAIL** — overflow |
| 5d | `loadGalleryLibraryProgress()` alone | **FAIL** — overflow |

**First restored section that reproduces the error:** `loadGalleryLibraryProgress()` — not a Gallery UI section.

---

## Root cause (mechanism)

`loadGalleryLibraryProgress()` scans `data/ops/intelligence/research-department/`:

- ~5,217 RVTR directories
- 2 async FS operations per directory (`await access`, `await readFile`)
- **~10,434 `await` boundaries** in a single async Server Component invocation

When the page function returns JSX, Next.js React Flight walks async component tasks via `visitAsyncNode`. That walker recurses once per registered async task. With ~10k tasks, the JS call stack overflows before the RSC stream completes.

This is **not**:

- a React client rerender loop
- circular component imports
- non-serializable props
- `useSearchParams()` (verified: gallery renders with `useSearchParams` when library scan is skipped)
- page-level `<Suspense>` (already removed in prior sprint; irrelevant)

---

## Fix applied

**File:** `lib/retroverse/gallery/load-gallery.ts`  
**Function:** `loadGalleryLibraryProgress`

Replace async per-file awaits with synchronous FS inside the existing loop:

```ts
const dirs = readdirSync(root);
for (const dir of dirs) {
  // ...
  if (existsSync(join(root, dir, "song-dna.json"))) songDnaCount += 1;
  try {
    const raw = readFileSync(join(root, dir, "collector.json"), "utf8");
    // ...
  } catch { /* no collector */ }
}
```

Behavior unchanged: same counts (`dirCount: 5217`, `songDnaCount: 5217`, `collectorChartCount: 3156`). Scan time ~2.5s (was ~3.2s async).

**No Gallery redesign.** `ExperienceGallery.tsx`, `useSearchParams`, and loader architecture left as-is.

---

## Verification (post-fix)

```
GET /retroverse/experiences?rvtr=RVTR001341 200 in 5152ms
[gallery-instrument] loadGalleryPageData EXIT
[gallery-instrument] Render #1: ExperienceGallery
[gallery-instrument] useSearchParams() call end { experience: null }
```

- HTTP 200
- `Experience Gallery` present in HTML
- No new `visitAsyncNode` overflow on successful requests
- `npx tsc --noEmit` — pass

---

## Why previous investigations missed it

1. **Correlated timing** — overflow always logged immediately after `return <ExperienceGallery data={data} />`, so attention went to the client boundary and `useSearchParams()`.
2. **Gallery UI isolation not run** — no step tested `loadGalleryLibraryProgress()` without `ExperienceGallery`; the loader was treated as cleared because it logged EXIT successfully.
3. **Loader EXIT is misleading** — the function completes; failure happens later during RSC serialization of the combined async task tree (layout + page awaits).
4. **Client silence interpreted as client bug** — no mount logs reinforced the `useSearchParams` / Suspense hypothesis; the client never received a complete Flight stream.

---

## Execution State

**COMPLETE** — Gallery renders at `/retroverse/experiences?rvtr=RVTR001341`. Root cause fixed in `loadGalleryLibraryProgress()`.
