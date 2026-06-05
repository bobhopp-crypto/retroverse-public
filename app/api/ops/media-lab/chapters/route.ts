import { NextResponse } from "next/server";

import { loadJobPreview } from "@/lib/ops/media-lab/read-job";
import { parseChapterMode } from "@/lib/ops/media-lab/chapter-mode";
import { regenerateChapters } from "@/lib/ops/media-lab/chapters-only";
import { jobOutputDir } from "@/lib/ops/media-lab/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { year?: number; jobSlug?: string; chapterMode?: unknown };
  try {
    body = (await req.json()) as { year?: number; jobSlug?: string; chapterMode?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year;
  const jobSlug = body.jobSlug?.trim();
  const chapterMode = parseChapterMode(body.chapterMode);
  if (!year || year < 1900 || year >= 2100 || !jobSlug) {
    return NextResponse.json({ error: "year and jobSlug required" }, { status: 400 });
  }

  const outputDir = jobOutputDir(year, jobSlug);

  try {
    await regenerateChapters(outputDir, chapterMode);
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Run Generate Transcript first (segments.json missing)",
      },
      { status: 400 },
    );
  }

  const preview = await loadJobPreview(outputDir);

  return NextResponse.json({
    ok: true,
    outputDir,
    jobSlug,
    ...preview,
  });
}
