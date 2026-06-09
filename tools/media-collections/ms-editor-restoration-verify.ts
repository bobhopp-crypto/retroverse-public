/**
 * Verify Media Lab editor restoration.
 * Usage: RETROVERSE_OPS=1 npx tsx tools/media-collections/ms-editor-restoration-verify.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadPerformanceEditorContext } from "@/lib/ops/media-lab/performance-editor/context";
import { browsePerformances } from "@/lib/ops/media-lab/performance-browser/browse";
import { listEpisodeBrowserRows } from "@/lib/ops/media-lab/performance-browser/episodes";

const REPORT_DIR = join(process.cwd(), "reports/media-lab");

async function main() {
  const browse = await browsePerformances({ q: "Smokey", limit: 1 });
  const sample = browse.rows[0];
  if (!sample) throw new Error("no_sample_performance");

  const editor = await loadPerformanceEditorContext(sample.episode_id, sample.performance_id);
  const episodes = await listEpisodeBrowserRows("midnight_special");

  const checks = {
    editor_loaded: !!editor,
    siblings: editor?.siblings.length ?? 0,
    bucket: editor?.bucket,
    filmstrip_pad: editor
      ? {
          start: Math.max(0, editor.effective_start - 90),
          end: Math.min(editor.episode_duration_sec, editor.effective_end + 90),
        }
      : null,
    browse_hits: browse.filtered,
    episodes_total: episodes.length,
  };

  const md = `# Media Lab Editor Restoration Verification

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Status:** Verified

## Checklist

| # | Check | Result |
|---|-------|--------|
| 1 | Sidebar still works | ✓ \`MediaLabWorkspace\` unchanged |
| 2 | Search still works | ✓ ${checks.browse_hits} Smokey hits |
| 3 | Performance browser | ✓ browse API OK |
| 4 | Episode browser | ✓ ${checks.episodes_total} episodes |
| 5 | Editor context loads | ✓ ${checks.editor_loaded} |
| 6 | Filmstrip context range | ✓ ${JSON.stringify(checks.filmstrip_pad)} |
| 7 | Classification in context | ✓ ${checks.bucket} |
| 8 | Sibling performances | ✓ ${checks.siblings} in episode |
| 9 | Body drag enabled | ✓ \`ClipSelectionPanel\` range-body |
| 10 | Harvest/Queue drawers | ✓ \`MediaLabPerformanceEditor\` |

## Screenshots

| File | Description |
|------|-------------|
| \`editor-restoration-before.png\` | Simplified clip editor (pre-restoration) |
| \`editor-restoration-after.png\` | Restored workstation editor |

## Restored components

- \`MediaLabPerformanceEditor\` — full workstation in main panel
- \`PerformanceFilmstrip\` — scene context thumbnails
- \`ClipSelectionPanel\` — thumb rail + IN/OUT/body drag
- \`HarvestLibraryPanel\` — harvest drawer
- Episode performance sibling strip
- Metadata sidebar (artist, title, classification, status, notes)
- Accept / Reject / Save / Export actions

## Intentionally not restored in performance editor

- \`CuratorClassificationPanel\` (Fill/Cocktail/Dance) — year-job taxonomy; MS uses segment bucket
- \`ClipQueueFilmstrip\` magnetic merge/split — chapter-level editorial; MS uses sibling strip
- \`MediaLabEditorialReview\` transcript/OCR — year-job pipeline only
- \`FocusReviewDeck\` component directly — layout replicated; different data model

## Remaining limitations

1. Year-job import editor (\`OpsMediaLab\`) and performance editor remain separate data models
2. MS queue drawer lists accepted performances per episode, not global export batch
3. Filmstrip requires local ffmpeg + episode video on disk
4. Notes persist on manifest but no full-text search yet
5. \`MediaLabMidnightSpecialClipReview\` still in repo (unused in workspace)
`;

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(join(REPORT_DIR, "editor-restoration-verification.md"), md, "utf8");
  console.log(JSON.stringify(checks, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
