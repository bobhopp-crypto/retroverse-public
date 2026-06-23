import { NextResponse } from "next/server";

import { saveVNextQrPlacement } from "@/lib/ops/content-creator/vnext-run";
import { normalizeQrPlacement } from "@/lib/ops/creative-lab/pass-layout";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const runId = typeof body.runId === "string" ? body.runId : "";
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "";
  const qrUrl = typeof body.qrUrl === "string" ? body.qrUrl : undefined;
  const qrPlacement = normalizeQrPlacement(body.qrPlacement);

  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });
  if (!qrPlacement) return NextResponse.json({ error: "qrPlacement required" }, { status: 400 });

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  try {
    const manifest = await saveVNextQrPlacement(runId, profile, { qrPlacement, qrUrl });
    return NextResponse.json({ ok: true, qrPlacement: manifest.qrPlacement });
  } catch (e) {
    const message = e instanceof Error ? e.message : "qr_placement_save_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
