import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { jobOutputDir } from "@/lib/ops/media-lab/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { writeSegmentManifestAtomic } from "@/lib/ops/media-lab/editorial/segment-manifest";
import { normalizeMarkers, type EditableChapterMap } from "@/lib/ops/media-lab/chapter-map";

function params(req: Request) { const u = new URL(req.url); const year = Number(u.searchParams.get("year")); const jobSlug = u.searchParams.get("jobSlug") ?? ""; return Number.isInteger(year) && /^[a-z0-9-]+$/i.test(jobSlug) ? { year, jobSlug, dir: jobOutputDir(year, jobSlug) } : null; }
export async function GET(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  const p = params(req); if (!p) return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  const path = join(p.dir, "chapter-map.json");
  if (!existsSync(path)) return NextResponse.json({ ok: true, map: null });
  return NextResponse.json({ ok: true, map: JSON.parse(await readFile(path, "utf8")) });
}
export async function PUT(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  const p = params(req); if (!p) return NextResponse.json({ error: "Invalid job" }, { status: 400 });
  const body = await req.json() as { map?: EditableChapterMap };
  if (!body.map || !Number.isFinite(body.map.sourceDurationSeconds) || !body.map.sourceFingerprint) return NextResponse.json({ error: "Valid chapter map required" }, { status: 400 });
  const map = { ...body.map, version: 1 as const, markers: normalizeMarkers(body.map.markers, body.map.sourceDurationSeconds), updatedAt: new Date().toISOString() };
  await writeSegmentManifestAtomic(join(p.dir, "chapter-map.json"), map as never);
  return NextResponse.json({ ok: true, map });
}
