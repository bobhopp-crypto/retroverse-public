import { NextResponse } from "next/server";

import { buildExperiencePatterns } from "@/lib/ops/studio/publisher/experience/patterns";

export async function GET() {
  const patterns = await buildExperiencePatterns();
  return NextResponse.json({ ok: true, patterns });
}
