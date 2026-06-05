import { NextResponse } from "next/server";

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

function parseYear(value: string | null): number | null {
  const y = Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim();
  if (year == null || !jobSlug) {
    return NextResponse.json({ error: "year and jobSlug required" }, { status: 400 });
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const bundle = await loadEditorialBundle(outputDir, { year, jobSlug });
    return NextResponse.json({ ok: true, outputDir, jobSlug, ...bundle });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    chapters?: { id?: string; startSec?: number; endSec?: number; title?: string }[];
    exportFiles?: boolean;
  };

  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year;
  const jobSlug = body.jobSlug?.trim();
  if (!year || year < 1900 || year >= 2100 || !jobSlug || !Array.isArray(body.chapters)) {
    return NextResponse.json({ error: "year, jobSlug, and chapters required" }, { status: 400 });
  }

  try {
    const outputDir = resolveJobOutputDir(year, jobSlug);
    const bundle = await loadEditorialBundle(outputDir, { year, jobSlug });
    const videoEnd =
      bundle.job.durationSeconds ??
      bundle.chapters.at(-1)?.endSec ??
      0;

    const chapters = parseEditorialChaptersPayload(body.chapters, videoEnd);

    if (body.exportFiles) {
      await exportEditorialChapters(outputDir, chapters);
    } else {
      const { writeChaptersFromRecords } = await import("@/lib/ops/media-lab/chapters-csv");
      await writeChaptersFromRecords(outputDir, chapters);
      const { readFile, writeFile } = await import("fs/promises");
      const { join } = await import("path");
      const job = JSON.parse(
        await readFile(join(outputDir, "job.json"), "utf8"),
      ) as { chapterCount?: number };
      job.chapterCount = chapters.length;
      await writeFile(join(outputDir, "job.json"), `${JSON.stringify(job, null, 2)}\n`, "utf8");
    }

    const preview = await loadJobPreview(outputDir);
    const refreshed = await loadEditorialBundle(outputDir, { year, jobSlug });

    return NextResponse.json({
      ok: true,
      outputDir,
      jobSlug,
      exported: Boolean(body.exportFiles),
      ...preview,
      editorial: refreshed,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
