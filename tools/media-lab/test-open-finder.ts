/**
 * Verify openInFinder uses reveal (-R) for files, open for directories.
 * Usage: npx tsx tools/media-lab/test-open-finder.ts
 */
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openInFinder } from "@/lib/ops/media-lab/open-local";

async function main() {
  if (process.platform !== "darwin") {
    console.log(JSON.stringify({ ok: true, skipped: "not macOS" }, null, 2));
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "retroverse-ml-finder-"));
  const filePath = join(dir, "sample-clip.mp4");
  await writeFile(filePath, "test");

  const fileResult = await openInFinder(filePath);
  const dirResult = await openInFinder(dir);

  console.log(
    JSON.stringify(
      {
        ok: fileResult.ok && dirResult.ok,
        fileResult,
        dirResult,
        note: "Finder should select sample-clip.mp4 (not open in QuickTime) and open the temp folder.",
      },
      null,
      2,
    ),
  );

  if (!fileResult.ok || !dirResult.ok) process.exit(1);
}

void main();
