import { NextResponse } from "next/server";

import { loadEditorialBundle } from "@/lib/ops/media-lab/editorial/load-editorial";
import { resolveJobOutputDir } from "@/lib/ops/media-lab/editorial/job-path";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { year?: number; jobSlug?: string };
  try {
    body = (await req.json()) as { year?: number; jobSlug?: string };
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
    return NextResponse.json({
      ok: true,
      suggestions: bundle.suggestions,
      count: bundle.suggestions.length,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Suggest failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
