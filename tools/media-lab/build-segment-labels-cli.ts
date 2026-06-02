#!/usr/bin/env npx tsx
/**
 * Build segment-labels.json / .txt and sync chapters.csv from segments.json.
 *
 * Usage: npx tsx tools/media-lab/build-segment-labels-cli.ts --output-dir /path/to/job
 */
import { regenerateSegmentLabels } from "../../lib/ops/media-lab/segment-labels";

function parseArgs(argv: string[]) {
  let outputDir = "";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--output-dir" && argv[i + 1]) outputDir = argv[++i];
  }
  return { outputDir };
}

async function main() {
  const { outputDir } = parseArgs(process.argv.slice(2));
  if (!outputDir) {
    console.error("Usage: npx tsx tools/media-lab/build-segment-labels-cli.ts --output-dir PATH");
    process.exit(1);
  }

  const { labels } = await regenerateSegmentLabels(outputDir);
  console.log(JSON.stringify({ ok: true, labelCount: labels.length }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
