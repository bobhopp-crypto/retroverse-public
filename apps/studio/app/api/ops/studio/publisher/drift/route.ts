import { NextResponse } from "next/server";

import { getLatestDriftReport } from "@/lib/ops/studio/publisher/experience/store";
import { runExperienceDriftCheck } from "@/lib/ops/studio/publisher/experience/drift";

export async function GET() {
  const report = await getLatestDriftReport();
  return NextResponse.json({ ok: true, report });
}

export async function POST() {
  const report = await runExperienceDriftCheck(null);
  return NextResponse.json({ ok: true, report });
}
