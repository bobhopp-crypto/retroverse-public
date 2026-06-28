#!/usr/bin/env node
/**
 * Studio pipeline health snapshot.
 *
 * Usage:
 *   npm run research:studio:snapshot
 */
require("../finance/preload-server-only.cjs");

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  buildPipelineHealthSnapshot,
  formatPipelineHealthSnapshot,
} from "../../lib/ops/studio/pipeline-snapshot.ts";

const REPORT_DIR = join(process.cwd(), "reports/studio");
const REPORT_PATH = join(REPORT_DIR, "PIPELINE_HEALTH.md");

async function main() {
  const snapshot = await buildPipelineHealthSnapshot();
  const report = formatPipelineHealthSnapshot(snapshot);
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(REPORT_PATH, `${report}\n`, "utf8");
  console.log(report);
  console.log(`\nReport: ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error("[studio snapshot]", err instanceof Error ? err.message : err);
  process.exit(1);
});
