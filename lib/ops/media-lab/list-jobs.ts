import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";

import { parseChapterMode } from "./chapter-mode";
import type { MediaLabJobMeta } from "./job-meta";
import type { MediaLabJobSummary } from "./job-summary";
import { yearProductionMetadataRoot } from "./paths";

export type { MediaLabJobSummary } from "./job-summary";

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function listMediaLabJobs(year: number): Promise<MediaLabJobSummary[]> {
  const root = yearProductionMetadataRoot(year);
  let names: string[] = [];
  try {
    names = await readdir(root);
  } catch {
    return [];
  }

  const out: MediaLabJobSummary[] = [];

  for (const jobSlug of names) {
    const outputDir = join(root, jobSlug);
    try {
      const st = await stat(outputDir);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }

    try {
      const job = JSON.parse(
        await readFile(join(outputDir, "job.json"), "utf8"),
      ) as MediaLabJobMeta;

      out.push({
        jobSlug,
        outputDir,
        sourceFilename: job.sourceFilename ?? jobSlug,
        createdAt: job.createdAt ?? "",
        durationSeconds: job.durationSeconds ?? null,
        segmentCount: job.segmentCount ?? 0,
        chapterCount: job.chapterCount ?? 0,
        segmentLabelCount: job.segmentLabelCount ?? null,
        chapterMode: parseChapterMode(job.chapterMode),
        hasSegments: await fileExists(join(outputDir, "segments.json")),
        hasTranscript: await fileExists(join(outputDir, "transcript.txt")),
        hasChapters: await fileExists(join(outputDir, "chapters.csv")),
        hasLabels: await fileExists(join(outputDir, "segment-labels.json")),
        hasEditorialMeta: await fileExists(join(outputDir, "editorial-meta.json")),
      });
    } catch {
      continue;
    }
  }

  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
