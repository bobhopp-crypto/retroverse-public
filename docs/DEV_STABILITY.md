# Local dev stability (Next.js chunk errors)

## Symptom

```text
Cannot find module './331.js'
```

Stale `.next` webpack chunks — not app logic. Common triggers:

- `npm run build` while `npm run dev` is running
- HMR after deleting or renaming routes
- Two dev servers fighting over the same `.next` folder

## Default workflow

```bash
npm run dev
```

The dev launcher (`tools/next-dev.mjs`) clears `.next` and `node_modules/.cache` before each start unless you opt out.

**Checkpoint:** first compile takes ~30–60s; then `http://localhost:3000/` returns 200.

## Scripts

| Command | Use |
|---------|-----|
| `npm run dev` | Stable dev (auto-clean) |
| `npm run dev:fast` | Skip clean when you trust the cache |
| `npm run dev:clean` | Force clean |
| `bash scripts/dev-reset.sh` | Kill 3000/3001, clean both apps, restart welcome + PUBLIC |

`npm run build` runs `prebuild` guard: fails if port 3000 is in use or dev marker is live.

## If chunks still break

1. Stop all `next dev` processes (Ctrl+C).
2. `npm run dev:clean` or `bash scripts/dev-reset.sh`.
3. Hard refresh the browser (Cmd+Shift+R).

Do not run `npm run build` while dev is up.

## Env flags

- `RETROVERSE_DEV_NO_CLEAN=1` — same as `dev:fast`
- `RETROVERSE_DEV_CLEAN=1` — same as `dev:clean`
