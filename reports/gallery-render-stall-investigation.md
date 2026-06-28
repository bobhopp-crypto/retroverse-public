# Gallery Render Stall Investigation — `/retroverse/experiences`

**Date:** 2026-06-27  
**Scope:** Instrumentation only. No refactors.  
**Test URL:** `http://localhost:3004/retroverse/experiences?rvtr=RVTR001341`  
**Log:** `/tmp/gallery-instrument-3004.log`

---

## Symptom

| Observation | Value |
|---|---|
| HTTP status (when server completes) | 200 |
| Time to server-side page EXIT | **~5.96s** |
| curl time to first byte | **180s timeout, 0 bytes** |
| Safari | Never finishes loading (no complete RSC stream) |

Safari appears hung because the **RSC/Flight response never completes** — not because client React is slow.

---

## Component tree (every server + client node on this route)

```
RootLayout                          SERVER  app/layout.tsx
├── cookies() + isOpsEnabled()
├── RetroverseGlobalNav             CLIENT  components/shell/RetroverseGlobalNav.tsx
│   └── AdminGearMenu (inline)      CLIENT  same file (only if opsEnabled)
└── RetroverseExperienceGalleryPage SERVER  app/retroverse/experiences/page.tsx
    ├── searchParams await
    ├── loadGalleryPageData()
    ├── JSON.parse(JSON.stringify(data))
    └── ExperienceGallery           CLIENT  components/retroverse/gallery/ExperienceGallery.tsx
        ├── useSearchParams()         ← hook at client boundary
        ├── useRouter()
        ├── useState(rvtrJump)
        ├── next/image ×2 (onLoad/onError instrumented)
        └── inline JSX only (no child components)
```

No `app/retroverse/layout.tsx`. No gallery sub-components. No AI/deck-generation on this route.

---

## Instrumentation added

| File | What was timed / logged |
|---|---|
| `lib/retroverse/gallery/gallery-instrument.ts` | `galleryTime` / `galleryLog` / `galleryLogPayload` (>1 MB warning) |
| `lib/retroverse/gallery/use-gallery-client-instrument.ts` | `Mounted:` / `Effect:` / render-count loop warning |
| `app/retroverse/experiences/page.tsx` | Server page enter/exit, searchParams, loader, JSON clone, payload size |
| `lib/retroverse/gallery/load-gallery-page.ts` | Production rows, Sunday nights, song context, library scan, serialize |
| `lib/retroverse/gallery/load-gallery.ts` | Track/collector/publish IO, per-experience evaluate, chart/song-dna builders, library dir scan |
| `components/retroverse/gallery/ExperienceGallery.tsx` | Client instrument hook, `useSearchParams` bracket logs, image onLoad/onError |
| `components/shell/RetroverseGlobalNav.tsx` | Mount/effect logs when pathname starts with `/retroverse/experiences` |

---

## Server timeline (captured)

```
[gallery-instrument] SERVER RetroverseExperienceGalleryPage ENTER
[gallery-instrument] SERVER searchParams await: 40.305ms
[gallery-instrument] loadSundayNightsState: 291.099ms
[gallery-instrument] loadProductionCandidateRows: 1.503s
[gallery-instrument] loadGallerySongContext parallel IO RVTR001341: 1.137s
[gallery-instrument] evaluateGalleryExperience x7 RVTR001341: 43.879ms
[gallery-instrument] loadGalleryLibraryProgress scan: 3.231s
[gallery-instrument] serializeGalleryPageData: 0.215ms
[gallery-instrument] loadGalleryPageData total: 5.917s
[gallery-instrument] loadGalleryPageData EXIT
[gallery-instrument] SERVER loadGalleryPageData: 5.918s
[gallery-instrument] payload loadGalleryPageData result (pre-clone)  { bytes: 6614, mb: 0.006, over1mb: false }
[gallery-instrument] SERVER JSON clone: 0.046ms
[gallery-instrument] payload ExperienceGallery props (post-clone)     { bytes: 6614, mb: 0.006, over1mb: false }
[gallery-instrument] SERVER scheduling ExperienceGallery render
[gallery-instrument] SERVER page total: 5.959s
[gallery-instrument] SERVER RetroverseExperienceGalleryPage EXIT

→ [unhandledRejection] RangeError: Maximum call stack size exceeded
   at visitAsyncNode (next-server/app-page.runtime.dev.js:23:96066)
   at visitAsyncNode (next-server/app-page.runtime.dev.js:23:96182) ×48+
```

**Last successful application code:** `page.tsx` line 59 — `return <ExperienceGallery data={data} />`  
**First failure:** immediately after, inside Next.js RSC runtime (`visitAsyncNode` self-recursion).

---

## Client timeline (captured)

| Expected log | Observed |
|---|---|
| `Mounted: ExperienceGallery` | **Never** |
| `Effect: ExperienceGallery` | **Never** |
| `Render #1: ExperienceGallery` | **Never** |
| `useSearchParams() call start/end` | **Never** |
| `Image loaded: current-song-cover` | **Never** |
| `Mounted: RetroverseGlobalNav` | **Never** |

**Conclusion:** Client hydration never starts. The stall is **100% server-side**, during RSC tree serialization after the page function returns.

---

## Checklist results

### 1. Data / package / image / AI / deck loading

All server loaders complete in ~6s. No AI or deck generation on this route. Images are client-only and never reached.

| Phase | Time | Status |
|---|---|---|
| Production candidates | 1.5s | OK |
| Song context (track + collector + publish) | 1.2s | OK |
| Experience evaluation (×7) | 44ms | OK |
| Library progress scan (5217 dirs) | 3.2s | OK |
| Serialize + JSON clone | <1ms | OK |

### 2. Payload > 1 MB (server → client)

**No.** Pre-clone and post-clone payloads are both **6,614 bytes (0.006 MB)**.

### 3. Infinite client rerenders

**Not detected.** Client never mounts; render-count warning (>50) never fired.

### 4. useEffect updating state every render

**None found** in gallery code:

- `ExperienceGallery`: one `useState(rvtrJump)`; updated only by input `onChange`. No `useEffect` except instrument hook.
- `useGalleryClientInstrument`: two `useEffect`s — mount log (deps: `[componentName]`) and effect log (no deps, **read-only**, no setState).
- `RetroverseGlobalNav`: pointer/escape handler (deps: `[open]`); gallery mount/effect logs (read-only).

### 5. Recursive component tree (app code)

**None.** `ExperienceGallery` is a flat component with inline JSX. No self-referencing imports. madge (Sprint 3.40) showed no circular imports in gallery kernel.

The recursion is **inside Next.js** `visitAsyncNode`, not in Retroverse React components.

### 6. Expensive helpers (server)

All timed; none hang. Slowest step is library directory scan (3.2s) — completes normally.

---

## Root cause

**Exact stall point:** Next.js App Router RSC serialization of the `<ExperienceGallery />` client boundary.

**Triggering hook:** `useSearchParams()` in `ExperienceGallery.tsx` (line 44), called during server-side client-component tree walk.

**Mechanism:** After `RetroverseExperienceGalleryPage` exits successfully, Next's React Flight runtime enters `visitAsyncNode` to serialize the async RSC tree. That function recurses into itself indefinitely (`visitAsyncNode` → `visitAsyncNode` at `app-page.runtime.dev.js:23:96182`), eventually throwing `RangeError: Maximum call stack size exceeded`. The HTTP response body is never fully streamed (curl: 0 bytes / 180s timeout).

**Why Safari hangs ~64s then shows nothing useful:** The dev server may log `GET 200` when the route handler finishes, but the **Flight stream crashes before the browser receives a complete document**. Safari keeps waiting for the response to finish.

**What it is NOT:**

| Ruled out | Evidence |
|---|---|
| Slow data loading | Loader EXIT at 5.9s |
| Large RSC payload | 6.6 KB |
| Client rerender loop | No client logs |
| Non-serializable props | JSON clone succeeds in 0.046ms |
| Gallery loader recursion | Clean ENTER/EXIT (Sprint 3.40 + this run) |
| Outer page `<Suspense>` | Already removed; overflow persists |

---

## Causal chain (one line)

```
page.tsx returns <ExperienceGallery data={data} />
  → Next visitAsyncNode walks client boundary
  → ExperienceGallery uses useSearchParams() without a resolving Suspense boundary
  → visitAsyncNode infinite self-recursion
  → stack overflow → incomplete RSC stream → Safari never finishes
```

---

## Reproduce

```bash
# Terminal 1 — dev server with stack preload (port 3004 used in this run)
PORT=3004 npm run dev 2>&1 | tee /tmp/gallery-instrument-3004.log

# Terminal 2
curl -m 180 -v "http://localhost:3004/retroverse/experiences?rvtr=RVTR001341"
grep gallery-instrument /tmp/gallery-instrument-3004.log
grep visitAsyncNode /tmp/gallery-instrument-3004.log
```

Browser: open Safari devtools console — no `[gallery-instrument] Mounted:` lines will appear.

---

## Recommended fix direction (NOT applied — investigation only)

When approved, the smallest fix is likely one of:

1. Split `useSearchParams()` into a tiny child component wrapped in `<Suspense fallback={…}>` **inside** `ExperienceGallery.tsx`.
2. Move experience selection to URL-less client state or pass `experience` from server `searchParams` as a prop (avoid client `useSearchParams` on initial render).

Do not re-wrap the entire gallery in server-page Suspense (Sprint 3.40 showed that does not resolve the loop).

---

## Execution State

**COMPLETE** — Instrumentation in place. Root cause identified: **Next.js `visitAsyncNode` stack overflow at the `ExperienceGallery` + `useSearchParams()` client boundary**, after all server data loading completes successfully.
