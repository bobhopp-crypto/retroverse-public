import { NextResponse } from "next/server";

import { buildTrainingHealthSnapshot } from "@/lib/ops/studio/training/department-health";

export async function GET() {
  const health = await buildTrainingHealthSnapshot();
  return NextResponse.json({ ok: true, health });
}
