import { NextResponse } from "next/server";

import { runVNextExport, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const runId = typeof body.runId === "string" ? body.runId : "";
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "";

  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  try {
    const result = await runVNextExport(runId, profile);
    const zipName = result.exportZipFilename ?? "export.zip";
    return NextResponse.json({
      ok: true,
      frontUrl: vNextFileUrl(result.runId, "export/final-front.png"),
      backUrl: vNextFileUrl(result.runId, "export/final-back.png"),
      exportZipUrl: vNextFileUrl(result.runId, zipName),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
