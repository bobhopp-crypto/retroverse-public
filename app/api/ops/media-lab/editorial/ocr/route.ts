import { existsSync } from "node:fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import {
  ensureAllChapterOcr,
  type ChapterOcrHint,
} from "@/lib/ops/media-lab/editorial/chapter-ocr";
import {
  normalizeChapterTimeline,
  readChaptersCsv,
  withEditorialIds,
} from "@/lib/ops/media-lab/chapters-csv";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import type { MediaLabJobMeta } from "@/lib/ops/media-lab/job-meta";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export type ChapterOcrResponse = Pick<
  ChapterOcrHint,
  "chapterId" | "rawText" | "lines" | "subjects" | "primarySubject" | "byFrame"
>;

function manifestToResponse(manifest: ChapterOcrHint): ChapterOcrResponse {
  return {
    chapterId: manifest.chapterId,
    rawText: manifest.rawText,
    lines: manifest.lines,
    subjects: manifest.subjects,
    primarySubject: manifest.primarySubject,
    byFrame: manifest.byFrame,
  };
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    chapters?: { id?: string; startSec?: number; endSec?: number }[];
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year;
  const jobSlug = body.jobSlug?.trim();
  if (!year || year < 1900 || year >= 2100 || !jobSlug) {
    return NextResponse.json({ error: "year and jobSlug required" }, { status: 400 });
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const job = JSON.parse(
      await readFile(join(outputDir, "job.json"), "utf8"),
    ) as MediaLabJobMeta;

    const videoPath = job.sourceVideo?.trim();
    if (!videoPath || !existsSync(videoPath)) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const videoEnd = job.durationSeconds ?? 0;
    let chapters = withEditorialIds(await readChaptersCsv(outputDir));
    chapters = normalizeChapterTimeline(chapters, videoEnd);

    if (Array.isArray(body.chapters) && body.chapters.length > 0) {
      const patch = new Map(
        body.chapters.map((ch, i) => [
          ch.id?.trim() || `ch-${i}`,
          {
            id: ch.id?.trim() || `ch-${i}`,
            startSec: Number(ch.startSec) || 0,
            endSec: Number(ch.endSec) || 0,
          },
        ]),
      );
      chapters = chapters.map((ch) => {
        const hit = patch.get(ch.id);
        return hit ? { ...ch, startSec: hit.startSec, endSec: hit.endSec } : ch;
      });
    }

    const manifests = await ensureAllChapterOcr(outputDir, videoPath, chapters);
    const ocr: Record<string, ChapterOcrResponse> = {};
    for (const m of manifests) {
      ocr[m.chapterId] = manifestToResponse(m);
    }

    return NextResponse.json({
      ok: true,
      total: manifests.length,
      ocr,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "OCR batch failed";
    const hint = message.includes("tesseract")
      ? "Install tesseract: brew install tesseract"
      : message.includes("ffmpeg")
        ? "Install ffmpeg: brew install ffmpeg"
        : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
