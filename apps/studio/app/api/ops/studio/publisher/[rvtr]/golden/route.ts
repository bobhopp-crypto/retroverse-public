import { NextResponse } from "next/server";

import { promoteToGoldenPackage } from "@/lib/ops/studio/publisher/experience/golden";
import { normalizeRvtr } from "@/lib/studio/status";

type RouteContext = { params: Promise<{ rvtr: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { rvtr: rvtrParam } = await context.params;
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const input = body as {
    showcaseReason?: string;
    publisherComment?: string;
    promotedBy?: string;
  };

  try {
    const golden = await promoteToGoldenPackage({
      rvtr,
      showcaseReason: input.showcaseReason,
      publisherComment: input.publisherComment,
      promotedBy: input.promotedBy,
    });
    return NextResponse.json({ ok: true, golden });
  } catch (err) {
    const message = err instanceof Error ? err.message : "promote_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
