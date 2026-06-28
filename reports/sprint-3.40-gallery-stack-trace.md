# Sprint 3.40 — Gallery Runtime Stack Trace Investigation

## Objective

Identify the **first recursive call** causing:

```
✓ Compiled /retroverse/experiences
RangeError: Maximum call stack size exceeded
```

No architecture changes. Investigation only.

---

## Instrumentation added

| File | Purpose |
|---|---|
| `tools/dev-stack-trace-preload.cjs` | `Error.stackTraceLimit = Infinity`; full stack on `unhandledRejection` / `uncaughtException`; repeating-frame analysis |
| `tools/next-dev.mjs` | Injects preload via `NODE_OPTIONS --require` for all `npm run dev` |
| `instrumentation.ts` | Next.js server hook — duplicate full-stack logging |
| `load-gallery-page.ts` | `[gallery-trace]` enter/exit + `console.time` |
| `app/retroverse/experiences/page.tsx` | `[gallery-trace]` enter/exit around loader + render |

---

## Timeline (RVTR001341, port 3002)

```
[gallery-trace] page ENTER
[gallery-trace] loadGalleryPageData ENTER { rvtrInput: 'RVTR001341' }
[gallery-trace] loadGallerySongContext OK { rvtr: 'RVTR001341' }
[gallery-trace] loadGalleryLibraryProgress OK { rows: 7 }
[gallery-trace] loadGalleryPageData total: 6.533s
[gallery-trace] loadGalleryPageData EXIT
[gallery-trace] page loadGalleryPageData OK
[gallery-trace] page JSON clone OK — rendering ExperienceGallery
[gallery-trace] page total: 6.578s
[gallery-trace] page EXIT (render scheduled)

→ RangeError: Maximum call stack size exceeded   ← AFTER loader completes
```

**Conclusion:** Recursion is **not** in `loadGalleryPageData`, `load-gallery.ts`, `experience-registry.ts`, or experience builders. Loader exits cleanly in ~6.5s.

---

## Full stack trace

```
RangeError: Maximum call stack size exceeded
    at Set.add (<anonymous>)
    at visitAsyncNode (next/dist/compiled/next-server/app-page.runtime.dev.js:23:96066)
    at visitAsyncNode (next/dist/compiled/next-server/app-page.runtime.dev.js:23:96182)
    at visitAsyncNode (next/dist/compiled/next-server/app-page.runtime.dev.js:23:96182)
    … repeated 48+ times …
    at visitAsyncNode (next/dist/compiled/next-server/app-page.runtime.dev.js:23:96182)
```

No Retroverse application frames appear in the repeating portion of the stack.

---

## Repeating call sequence

| # | Function | File | Line |
|---|---|---|---|
| 1 | `Set.add` | (V8 internal) | — |
| 2 | `visitAsyncNode` | `node_modules/next/dist/compiled/next-server/app-page.runtime.dev.js` | **23:96066** (entry) |
| 3 | `visitAsyncNode` | same | **23:96182** (self-call, ×48) |

**Exact recursive loop:**

```
visitAsyncNode  →  visitAsyncNode  →  visitAsyncNode  →  …
     ↑___________________________________|
```

This is **Next.js React Flight** walking/rendering the async RSC tree. The visited-set (`Set.add`) never stabilizes because the tree walk never reaches a base case.

---

## First application trigger (causal, not repeating)

The last application code to run before the loop:

| File | Line | Code |
|---|---|---|
| `app/retroverse/experiences/page.tsx` | 29–32 | `return (<Suspense …><ExperienceGallery data={data} /></Suspense>)` |

Gallery loader and JSON clone both succeed. Overflow begins when Next serializes/render-schedules the **client boundary** for `ExperienceGallery` (which uses `useSearchParams()`).

**No application function repeats in the stack.** The loop is entirely inside Next's `visitAsyncNode`.

---

## Ruled out

| Candidate | Evidence |
|---|---|
| Registry bootstrap recursion | Loader completes; madge: no circular imports |
| `load-gallery-page` ↔ `load-gallery` cycle | Trace shows clean ENTER/EXIT |
| Experience builders | `loadGallerySongContext OK` in 6.5s total |
| Non-serializable `launchPath` props | `JSON.stringify(data)` OK before render; trace reaches "JSON clone OK" |

---

## Recommended one-line fix

**Remove the redundant `<Suspense>` wrapper** in `app/retroverse/experiences/page.tsx` — `ExperienceGallery` already uses `useSearchParams()` and should own its own Suspense boundary internally, not via the server page:

```tsx
// page.tsx line ~29 — change:
return <ExperienceGallery data={data} />;
```

Alternative one-liner if Suspense is required: wrap only a tiny `useSearchParams` child inside `ExperienceGallery.tsx`, not the full gallery on the server page.

---

## Raw log location

Captured via `npm run dev` (preload enabled) + `GET /retroverse/experiences?rvtr=RVTR001341`:

```
/tmp/gallery-dev-trace.log
```

---

## Execution State

**COMPLETE** — Recursive loop identified: `visitAsyncNode` self-recursion in Next RSC runtime, triggered after `page.tsx` returns `<ExperienceGallery />`. Gallery data loaders are not the recursion source.
