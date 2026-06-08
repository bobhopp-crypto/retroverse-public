import { NextResponse } from "next/server";

import { jobOutputDir } from "@/lib/ops/media-lab/paths";
import { loadJobPreview } from "@/lib/ops/media-lab/read-job";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const outputDir = jobOutputDir(year, jobSlug);
    const preview = await loadJobPreview(outputDir);
    return NextResponse.json({
      ok: true,
      jobSlug,
      outputDir,
      ...preview,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
