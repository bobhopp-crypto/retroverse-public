import { NextResponse } from "next/server";

import { normalizeConceptStrategyMap, normalizeConceptStrategyId } from "@/lib/ops/creative-lab/concept-strategies";
import { duplicatePreset, listPresets, savePreset } from "@/lib/ops/creative-lab/presets";
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

  if (body.op === "duplicate") {
    const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : "";
    const newId = typeof body.newId === "string" ? body.newId.trim() : "";
    const newName = typeof body.newName === "string" ? body.newName.trim() : "";
    if (!sourceId || !newId || !newName) {
      return NextResponse.json({ error: "source_new_id_name_required" }, { status: 400 });
    }
    const preset = await duplicatePreset(sourceId, newId, newName);
    if (!preset) return NextResponse.json({ error: "source_not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, preset });
  }

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
    credentialStyle: typeof body.credentialStyle === "string" ? body.credentialStyle : undefined,
    illustrationStyle: typeof body.illustrationStyle === "string" ? body.illustrationStyle : undefined,
    colorStyle: typeof body.colorStyle === "string" ? body.colorStyle : undefined,
    densityStyle: typeof body.densityStyle === "string" ? body.densityStyle : undefined,
    defaultConceptStrategy: normalizeConceptStrategyId(body.defaultConceptStrategy),
    conceptStrategies: normalizeConceptStrategyMap(body.conceptStrategies),
    builtin: body.builtin === true,
  });

  return NextResponse.json({ ok: true, preset });
}
