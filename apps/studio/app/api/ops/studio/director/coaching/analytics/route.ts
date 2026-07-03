import { NextResponse } from "next/server";

import { buildDirectorAnalytics } from "@/lib/ops/studio/director/coaching";

export async function GET() {
  const analytics = await buildDirectorAnalytics();
  return NextResponse.json({ ok: true, analytics });
}
