import { existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import { jobOutputDir } from "@/lib/ops/media-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  readSegmentManifest,
  segmentManifestPath,
  sourceFingerprintFromStat,
  validateOutputPath,
  validateSegmentBounds,
  writeSegmentManifestAtomic,
  type EditorialSegment,
  type EditorialSegmentManifest,
} from "@/lib/ops/media-lab/editorial/segment-manifest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) { return NextResponse.json({ ok: false, error: message }, { status }); }
function jobParams(req: Request) {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim() ?? "";
  if (!Number.isInteger(year) || year < 1900 || year >= 2100 || !/^[a-z0-9-]+$/i.test(jobSlug)) return null;
  return { year, jobSlug, outputDir: jobOutputDir(year, jobSlug) };
}

async function loadContext(req: Request) {
  const params = jobParams(req);
  if (!params) return null;
  const jobPath = join(params.outputDir, "job.json");
  if (!existsSync(jobPath)) return null;
  const job = JSON.parse(await (await import("node:fs/promises")).readFile(jobPath, "utf8")) as { sourceVideo?: string; sourceFilename?: string; durationSeconds?: number | null };
  const sourcePath = job.sourceVideo?.trim() ?? "";
  if (!sourcePath || !existsSync(sourcePath)) return { ...params, job, sourcePath, sourceStat: null };
  const sourceStat = await stat(sourcePath);
  return { ...params, job, sourcePath, sourceStat };
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const context = await loadContext(req);
    if (!context) return fail("Valid year, jobSlug, and job are required", 400);
    const manifest = await readSegmentManifest(segmentManifestPath(context.outputDir));
    if (!manifest) return NextResponse.json({ ok: true, manifest: null, sourceChanged: false });
    const currentFingerprint = context.sourceStat ? sourceFingerprintFromStat(context.sourcePath, context.sourceStat.size, context.sourceStat.mtimeMs) : null;
    return NextResponse.json({ ok: true, manifest, sourceChanged: currentFingerprint != null && currentFingerprint !== manifest.sourceFingerprint, sourceFingerprint: currentFingerprint });
  } catch (error) { return fail(error instanceof Error ? error.message : "Could not load segments"); }
}

export async function PUT(req: Request) {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const context = await loadContext(req);
    if (!context || !context.sourceStat) return fail("Source video is missing", 400);
    const body = await req.json() as { segment?: EditorialSegment; deleteId?: string; acknowledgeSourceChange?: boolean };
    const path = segmentManifestPath(context.outputDir);
    const previous = await readSegmentManifest(path);
    const fingerprint = sourceFingerprintFromStat(context.sourcePath, context.sourceStat.size, context.sourceStat.mtimeMs);
    if (previous && previous.sourceFingerprint !== fingerprint && !body.acknowledgeSourceChange) return fail("Source fingerprint changed; acknowledge before editing or exporting", 409);
    const duration = Number(context.job.durationSeconds ?? 0);
    const segments = previous?.segments ? [...previous.segments] : [];
    if (body.deleteId) {
      const index = segments.findIndex((segment) => segment.id === body.deleteId);
      if (index < 0) return fail("Segment not found", 404);
      segments.splice(index, 1);
    } else if (body.segment) {
      const segment = body.segment;
      const errors = validateSegmentBounds(segment, duration);
      if (errors.length) return fail(errors.join("; "));
      if (segment.outputFilepath) {
        const outputErrors = validateOutputPath(segment.outputFilepath, join(context.outputDir, "exports"), context.sourcePath);
        if (outputErrors.length) return fail(outputErrors.join("; "));
      }
      const index = segments.findIndex((item) => item.id === segment.id);
      const now = new Date().toISOString();
      const next = { ...segment, createdAt: index >= 0 ? segments[index].createdAt : (segment.createdAt || now), modifiedAt: now };
      if (index >= 0) segments[index] = next; else segments.push(next);
    } else return fail("segment or deleteId required");
    segments.sort((a, b) => a.startSeconds - b.startSeconds || a.id.localeCompare(b.id));
    const manifest: EditorialSegmentManifest = { version: 1, sourceFilename: context.job.sourceFilename ?? context.sourcePath.split("/").pop() ?? "source", sourceFingerprint: fingerprint, sourceDurationSeconds: duration, segments, updatedAt: new Date().toISOString() };
    await writeSegmentManifestAtomic(path, manifest);
    return NextResponse.json({ ok: true, manifest });
  } catch (error) { return fail(error instanceof Error ? error.message : "Could not save segment"); }
}
