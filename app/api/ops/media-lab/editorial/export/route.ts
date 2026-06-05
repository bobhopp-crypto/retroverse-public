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

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: {
    year?: number;
    jobSlug?: string;
    chapters?: { id?: string; startSec?: number; endSec?: number; title?: string }[];
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

    const chapters = body.chapters?.length
      ? parseEditorialChaptersPayload(body.chapters, videoEnd)
      : bundle.chapters.map(({ id, startSec, endSec, title }) => ({
          id,
          startSec,
          endSec,
          title,
        }));

    await exportEditorialChapters(outputDir, chapters);
    const preview = await loadJobPreview(outputDir);

    return NextResponse.json({
      ok: true,
      outputDir,
      jobSlug,
      chapterCount: chapters.length,
      message: "Exported chapters.csv and segment-labels.txt",
      ...preview,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
