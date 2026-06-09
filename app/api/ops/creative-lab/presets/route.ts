import { NextResponse } from "next/server";

import { listPresets, savePreset } from "@/lib/ops/creative-lab/presets";
import { normalizeStyleSelection } from "@/lib/ops/creative-lab/style-catalog";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const presets = await listPresets();
  return NextResponse.json({ ok: true, presets });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!id || !name) {
    return NextResponse.json({ error: "id_and_name_required" }, { status: 400 });
  }

  const preset = await savePreset({
    id,
    name,
    description: typeof body.description === "string" ? body.description : "",
    styleSelection: normalizeStyleSelection(body.styleSelection),
  });

  return NextResponse.json({ ok: true, preset });
}
