import { existsSync } from "node:fs";
import { NextResponse } from "next/server";

import { loadEditorialBundle } from "@/lib/ops/media-lab/editorial/load-editorial";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import {
  exportHarvestQueue,
  findHarvestConflicts,
  type HarvestDuplicateAction,
  type HarvestExportItem,
} from "@/lib/ops/media-lab/harvest/export-harvest";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function parseDuplicateAction(raw: unknown): HarvestDuplicateAction | undefined {
  if (raw === "skip" || raw === "replace" || raw === "replace_all") return raw;
  return undefined;
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    sourceProgram?: string;
    checkOnly?: boolean;
    duplicateAction?: string;
    items?: HarvestExportItem[];
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year;
  const jobSlug = body.jobSlug?.trim();
  const sourceProgram = body.sourceProgram?.trim() || "Media Lab";
  const items = Array.isArray(body.items) ? body.items : [];
  const duplicateAction = parseDuplicateAction(body.duplicateAction);
  const checkOnly = body.checkOnly === true;

  if (!year || year < 1900 || year >= 2100 || !jobSlug) {
    return NextResponse.json({ error: "year and jobSlug required" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "Queue is empty" }, { status: 400 });
  }

  for (const item of items) {
    if (!item.chapterId?.trim()) {
      return NextResponse.json({ error: "Each queue item needs a chapterId" }, { status: 400 });
    }
    if (!item.title?.trim()) {
      return NextResponse.json({ error: "Each queue item needs a title" }, { status: 400 });
    }
    if (
      !Number.isFinite(item.inSeconds) ||
      !Number.isFinite(item.outSeconds) ||
      item.outSeconds <= item.inSeconds
    ) {
      return NextResponse.json({ error: "Invalid IN/OUT on queue item" }, { status: 400 });
    }
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const bundle = await loadEditorialBundle(outputDir, { year, jobSlug });
    const sourceVideo = bundle.job.sourceVideo?.trim();
    if (!sourceVideo || !existsSync(sourceVideo)) {
      return NextResponse.json({ error: "Source video not found" }, { status: 404 });
    }

    const conflicts = findHarvestConflicts(items);

    if (checkOnly || (!duplicateAction && conflicts.length > 0)) {
      return NextResponse.json({
        ok: true,
        checkOnly: true,
        conflictCount: conflicts.length,
        conflicts,
        libraryRoot: process.env.MEDIA_LAB_LIBRARY?.trim() || undefined,
      });
    }

    const result = await exportHarvestQueue(
      sourceVideo,
      {
        sourceProgram,
        sourceFile: sourceVideo,
        jobSlug,
        year,
      },
      items,
      duplicateAction,
    );

    return NextResponse.json({
      ok: true,
      libraryRoot: result.libraryRoot,
      exportedCount: result.exported.length,
      skippedCount: result.skipped.length,
      failedCount: result.failed.length,
      exported: result.exported,
      skipped: result.skipped,
      failed: result.failed,
      reportPath: result.reportPath,
      message: `Harvested ${result.exported.length} clip${result.exported.length === 1 ? "" : "s"} to MEDIA_LAB_LIBRARY`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    const hint = message.includes("ffmpeg")
      ? "Install ffmpeg: brew install ffmpeg"
      : undefined;
    return NextResponse.json({ error: message, hint }, { status: 500 });
  }
}
