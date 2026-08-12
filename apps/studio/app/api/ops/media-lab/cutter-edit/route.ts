import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { readChaptersCsv } from "@/lib/ops/media-lab/chapters-csv";
import {
  applyExtractionTransaction,
  applyReturnToTimelineTransaction,
  applyUndoTransaction,
  createEmptyCutterManifest,
  updateCutterClip,
  type CutterTranscriptSegment,
} from "@/lib/ops/media-lab/cutter-edit-model";
import {
  loadOrMigrateCutterManifest,
  readCutterManifest,
  writeCutterManifestAtomic,
} from "@/lib/ops/media-lab/cutter-edit-store";
import { sourceFingerprintFromStat } from "@/lib/ops/media-lab/editorial/segment-manifest";
import type { MediaLabJobMeta } from "@/lib/ops/media-lab/job-meta";
import { jobOutputDir } from "@/lib/ops/media-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CutterOperation =
  | {
      type: "extract";
      sourceInSec: number;
      sourceOutSec: number;
      sourcePlayheadSec: number;
    }
  | {
      type: "return";
      clipId: string;
      sourcePlayheadSec: number;
      activeInSec: number | null;
    }
  | { type: "undo" }
  | {
      type: "update_clip";
      clipId: string;
      title?: string;
      includeForExport?: boolean;
      notes?: string;
    };

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function requestIdentity(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim() ?? "";
  if (
    !Number.isInteger(year) ||
    year < 1900 ||
    year >= 2100 ||
    !/^[a-z0-9-]+$/i.test(jobSlug)
  ) {
    return null;
  }
  return { year, jobSlug, jobDirectory: jobOutputDir(year, jobSlug) };
}

async function loadContext(request: Request) {
  const identity = requestIdentity(request);
  if (!identity) return null;
  const jobPath = join(identity.jobDirectory, "job.json");
  if (!existsSync(jobPath)) return null;
  const job = JSON.parse(await readFile(jobPath, "utf8")) as MediaLabJobMeta;
  const sourcePath = job.sourceVideo?.trim() ?? "";
  if (
    !sourcePath ||
    !existsSync(sourcePath) ||
    !Number.isFinite(job.durationSeconds) ||
    !job.durationSeconds ||
    !job.sourceFingerprint
  ) {
    return { ...identity, job, sourcePath, currentFingerprint: null };
  }
  const sourceStat = await stat(sourcePath);
  const currentFingerprint = sourceFingerprintFromStat(
    sourcePath,
    sourceStat.size,
    sourceStat.mtimeMs,
  );
  return { ...identity, job, sourcePath, currentFingerprint };
}

async function readTranscript(jobDirectory: string): Promise<CutterTranscriptSegment[]> {
  try {
    const parsed = JSON.parse(
      await readFile(join(jobDirectory, "segments.json"), "utf8"),
    ) as CutterTranscriptSegment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadManifestContext(request: Request) {
  const context = await loadContext(request);
  if (!context || !context.currentFingerprint) return null;
  const now = new Date().toISOString();
  if (context.currentFingerprint !== context.job.sourceFingerprint) {
    const existing = await readCutterManifest(context.jobDirectory);
    return {
      ...context,
      manifest:
        existing ??
        createEmptyCutterManifest({
          sourceFilename: context.job.sourceFilename,
          sourceFingerprint: context.job.sourceFingerprint!,
          sourceDurationSec: context.job.durationSeconds!,
          now,
        }),
      migratedCount: 0,
      skippedLegacyCount: 0,
      now,
    };
  }
  const migration = await loadOrMigrateCutterManifest({
    jobDirectory: context.jobDirectory,
    sourceFilename: context.job.sourceFilename,
    sourceFingerprint: context.job.sourceFingerprint!,
    sourceDurationSec: context.job.durationSeconds!,
    now,
  });
  return { ...context, ...migration, now };
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const context = await loadManifestContext(request);
    if (!context) return fail("Valid job and source video are required", 400);
    const sourceChanged =
      context.currentFingerprint !== context.job.sourceFingerprint ||
      context.manifest.sourceFingerprint !== context.job.sourceFingerprint;
    return NextResponse.json({
      ok: true,
      manifest: context.manifest,
      sourceChanged,
      sourceFingerprint: context.job.sourceFingerprint,
      migration: {
        migratedCount: context.migratedCount,
        skippedLegacyCount: context.skippedLegacyCount,
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not load Cutter edits");
  }
}

export async function PUT(request: Request) {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const context = await loadManifestContext(request);
    if (!context) return fail("Valid job and source video are required", 400);
    const body = (await request.json()) as {
      expectedSourceFingerprint?: string;
      operation?: CutterOperation;
    };
    if (!body.operation) return fail("Cutter operation is required");
    if (
      !body.expectedSourceFingerprint ||
      body.expectedSourceFingerprint !== context.currentFingerprint ||
      body.expectedSourceFingerprint !== context.job.sourceFingerprint ||
      context.manifest.sourceFingerprint !== context.job.sourceFingerprint
    ) {
      return fail("Source fingerprint mismatch; no edit was saved.", 409);
    }

    const now = new Date().toISOString();
    if (body.operation.type === "extract") {
      const [transcriptSegments, chapters] = await Promise.all([
        readTranscript(context.jobDirectory),
        readChaptersCsv(context.jobDirectory).catch(() => []),
      ]);
      const result = applyExtractionTransaction(context.manifest, {
        sourceFingerprint: body.expectedSourceFingerprint,
        sourceInSec: body.operation.sourceInSec,
        sourceOutSec: body.operation.sourceOutSec,
        sourcePlayheadSec: body.operation.sourcePlayheadSec,
        transcriptSegments,
        existingLabels: chapters.map((chapter) => ({
          startSec: chapter.startSec,
          endSec: chapter.endSec,
          title: chapter.title,
        })),
        now,
      });
      await writeCutterManifestAtomic(context.jobDirectory, result.manifest);
      return NextResponse.json({ ok: true, operation: "extract", ...result });
    }

    if (body.operation.type === "return") {
      const result = applyReturnToTimelineTransaction(context.manifest, {
        sourceFingerprint: body.expectedSourceFingerprint,
        clipId: body.operation.clipId,
        sourcePlayheadSec: body.operation.sourcePlayheadSec,
        activeInSec: body.operation.activeInSec,
        now,
      });
      await writeCutterManifestAtomic(context.jobDirectory, result.manifest);
      return NextResponse.json({ ok: true, operation: "return", ...result });
    }

    if (body.operation.type === "undo") {
      const result = applyUndoTransaction(context.manifest, {
        sourceFingerprint: body.expectedSourceFingerprint,
        now,
      });
      await writeCutterManifestAtomic(context.jobDirectory, result.manifest);
      return NextResponse.json({ ok: true, operation: "undo", ...result });
    }

    const manifest = updateCutterClip(context.manifest, {
      sourceFingerprint: body.expectedSourceFingerprint,
      clipId: body.operation.clipId,
      title: body.operation.title,
      includeForExport: body.operation.includeForExport,
      notes: body.operation.notes,
      now,
    });
    await writeCutterManifestAtomic(context.jobDirectory, manifest);
    return NextResponse.json({ ok: true, operation: "update_clip", manifest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cutter edit failed";
    const status = /overlap|Out|In|duration|finite|source/i.test(message) ? 400 : 500;
    return fail(message, status);
  }
}
