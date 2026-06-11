import { NextResponse } from "next/server";

import { buildExportApiResponse } from "@/lib/ops/content-creator/export-api-response";
import { normalizePrintQuantity } from "@/lib/ops/content-creator/serial-stamp";
import { runVNextExport } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/** Rebuild full print package (QR + numbered backs + 12-up sheets). */
export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const runId = typeof body.runId === "string" ? body.runId : "";
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "";
  const quantity = normalizePrintQuantity(body.quantity);
  const qrUrl = typeof body.qrUrl === "string" ? body.qrUrl : undefined;

  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  try {
    const result = await runVNextExport(runId, profile, { quantity, qrUrl });
    return NextResponse.json(buildExportApiResponse(result));
  } catch (e) {
    const message = e instanceof Error ? e.message : "export_print_sheet_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
