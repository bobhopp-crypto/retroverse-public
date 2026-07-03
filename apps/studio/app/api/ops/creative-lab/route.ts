import { NextResponse } from "next/server";

import { STYLE_CATALOG, allStyleDefinitions } from "@/lib/ops/creative-lab/style-catalog";
import { listPresets } from "@/lib/ops/creative-lab/presets";
import { listProjects } from "@/lib/ops/creative-lab/projects";
import { CREATIVE_LAB_MODULES } from "@/lib/ops/creative-lab/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const [projects, presets] = await Promise.all([listProjects(), listPresets()]);

  return NextResponse.json({
    ok: true,
    modules: CREATIVE_LAB_MODULES,
    styleCatalog: STYLE_CATALOG,
    styles: allStyleDefinitions(),
    presets,
    projects,
  });
}
