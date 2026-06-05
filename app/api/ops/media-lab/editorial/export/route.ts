import { existsSync } from "node:fs";
import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import {
  filterChaptersForExport,
  mergeEditorialMetaPayload,
  readEditorialMeta,
  writeEditorialMeta,
  type ExportFilterMode,
} from "@/lib/ops/media-lab/editorial/editorial-meta";
import { exportAcquisitionMedia } from "@/lib/ops/media-lab/editorial/export-acquisition";
import { exportEditorialChapters } from "@/lib/ops/media-lab/editorial/export-editorial";
import {
  loadEditorialBundle,
  parseEditorialChaptersPayload,
} from "@/lib/ops/media-lab/editorial/load-editorial";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import { loadJobPreview } from "@/lib/ops/media-lab/read-job";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    chapters?: { id?: string; startSec?: number; endSec?: number; title?: string }[];
    chapterMeta?: Record<
      string,
      {
        reviewStatus?: string;
        favorite?: boolean;
        category?: string;
        inSeconds?: number;
        outSeconds?: number;
        lengthSeconds?: number;
      }
    >;
    sourceReviewStatus?: string;
    /** Future UI: "favorites" | "kept" | "everything" */
    exportMode?: ExportFilterMode;
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
    const bundle = await loadEditorialBundle(outputDir, { year, jobSlug });
    const videoEnd =
      bundle.job.durationSeconds ??
      bundle.chapters.at(-1)?.endSec ??
      0;

    const chapterById = new Map(bundle.chapters.map((ch) => [ch.id, ch]));

    const allChapters = body.chapters?.length
      ? parseEditorialChaptersPayload(body.chapters, videoEnd)
      : bundle.chapters.map(({ id, startSec, endSec, title }) => ({
          id,
          startSec,
          endSec,
          title,
        }));

    if (body.chapterMeta || body.sourceReviewStatus !== undefined) {
      const existing = await readEditorialMeta(outputDir);
      const merged = mergeEditorialMetaPayload(existing, {
        chapters: body.chapterMeta,
        sourceReviewStatus: body.sourceReviewStatus,
      });
      await writeEditorialMeta(outputDir, merged);
    }

    const editorialMeta = await readEditorialMeta(outputDir);
    const chaptersWithStatus = allChapters.map((ch) => {
      const row = chapterById.get(ch.id);
      const meta = editorialMeta.chapters[ch.id];
      return {
        ...ch,
        reviewStatus: meta?.reviewStatus,
        favorite: meta?.favorite,
        category: meta?.category,
        tagSuggestion: row?.tagSuggestion ?? null,
      };
    });
    const exportMode: ExportFilterMode =
      body.exportMode === "favorites" ||
      body.exportMode === "everything" ||
      body.exportMode === "kept"
        ? body.exportMode
        : "kept";
    const exportChapters = filterChaptersForExport(chaptersWithStatus, exportMode);

    const sourceVideo = bundle.job.sourceVideo?.trim();
    if (!sourceVideo || !existsSync(sourceVideo)) {
      return NextResponse.json({ error: "Source video not found" }, { status: 404 });
    }

    const job = await exportEditorialChapters(outputDir, allChapters, exportChapters);
    const acquisition = await exportAcquisitionMedia(
      outputDir,
      sourceVideo,
      {
        year: bundle.job.year,
        jobSlug: bundle.job.jobSlug,
        sourceFilename: bundle.job.sourceFilename,
        sourceShow:
          bundle.job.sourceFilename.replace(/\.[^.]+$/, "") || bundle.job.jobSlug,
      },
      exportChapters,
      editorialMeta.sourceReviewStatus,
    );

    const preview = await loadJobPreview(outputDir);
    const folders = [...new Set(acquisition.clips.map((c) => c.assetFolder))].join(", ");
    const sourceNote = acquisition.sourcePath ? " Source → ARCHIVE/." : "";

    return NextResponse.json({
      ok: true,
      outputDir,
      jobSlug,
      chapterCount: allChapters.length,
      exportCount: exportChapters.length,
      clipAssetsDir: acquisition.assetsRootDir,
      sourceArchiveDir: acquisition.sourceArchiveDir,
      sourcePath: acquisition.sourcePath,
      clipPaths: acquisition.clips.map((c) => c.path),
      routedFolders: folders,
      failedClips: acquisition.failed,
      message: `Exported ${acquisition.clips.length} Keep clips → ASSETS/{${folders}}.${sourceNote}`,
      ...preview,
      job,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    const hint = message.includes("ffmpeg")
      ? "Install ffmpeg: brew install ffmpeg"
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 400 });
  }
}
