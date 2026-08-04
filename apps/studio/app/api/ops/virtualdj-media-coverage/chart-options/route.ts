import { NextResponse } from "next/server";

import { loadBillboardChartOptions } from "@/lib/ops/virtualdj-media-coverage/targets/billboard-hot100";
import { buildVirtualDjLibraryIndex } from "@/lib/ops/virtualdj-media-coverage/vdj-index";

import { coverageError, requireCoverageOps } from "../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  try {
    const [options, inventory] = await Promise.all([
      loadBillboardChartOptions(),
      buildVirtualDjLibraryIndex(),
    ]);
    return NextResponse.json({ ok: true, options, inventory: inventory.summary });
  } catch (error) {
    return coverageError(error, "Could not load Billboard chart options");
  }
}
