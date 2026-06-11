import { NextResponse } from "next/server";

import { loadGenerationManifest } from "@/lib/ops/content-creator/library";
import { loadVNextManifest, runVNextExport, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

/** Re-export a prior generation (uses vnext run if still on disk). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const record = await loadGenerationManifest(id);
  if (!record) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === record.eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  try {
    await loadVNextManifest(record.runId);
    const result = await runVNextExport(record.runId, profile);
    const zipName = result.exportZipFilename ?? "export.zip";
    return NextResponse.json({
      ok: true,
      exportZipUrl: vNextFileUrl(result.runId, zipName),
      qrVerification: result.qrVerification,
    });
  } catch {
    return NextResponse.json(
      { error: "vnext_run_missing", message: "Source run not found — open in creator and export again." },
      { status: 410 },
    );
  }
}
