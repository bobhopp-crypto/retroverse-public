# Retroverse Knowledge Department — Phase 1 Bootstrap

Read-only repository knowledge base. Cursor orchestrates discovery and structure; local Ollama (`qwen3:8b`) enriches summaries.

## Outputs

| File | Purpose |
|------|---------|
| `markdown-index.json` | Structured record per markdown file |
| `inventory.md` | Human-readable file list |
| `timeline.md` | Evidence-based chronological milestones |
| `knowledge-graph.json` | Projects, systems, concepts, cross-links |
| `executive-summary.md` | Documentary outline of the repo |
| `progress.json` | Resumable checkpoint state |

## Commands

```bash
# Fast pass: discover + heuristic index + timeline/graph/summary (~1 min)
npm run knowledge:bootstrap

# Resume Ollama enrichment (long-running, ~8s/file)
npm run knowledge:bootstrap:ollama

# Ollama batch with limit
npx tsx tools/knowledge-department/bootstrap.ts --ollama --phase ollama --ollama-limit 50 --resume
```

## Resume

All progress is checkpointed in `progress.json` and `markdown-index.json`. Re-run with `--resume` to continue where you left off.

## Phase 2 Recommendations

See `completion-report.json` after each run.
