import { NextResponse } from "next/server";

import { buildDirectorTrainingPayload } from "@/lib/ops/studio/director/coaching";
import { normalizeRvtr } from "@/lib/studio/status";

type RouteContext = { params: Promise<{ rvtr: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { rvtr: rvtrParam } = await context.params;
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }

  const payload = await buildDirectorTrainingPayload(rvtr);
  if (!payload) {
    return NextResponse.json({ ok: false, error: "no_director_package" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, payload });
}

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
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = body as {
    exhibitId?: string;
    verdict?: string;
    reasons?: string[];
    note?: string | null;
    frameAssetId?: string | null;
    frameCategory?: string | null;
  };

  if (!input.exhibitId || !input.verdict) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  if (!["perfect", "good", "wrong"].includes(input.verdict)) {
    return NextResponse.json({ ok: false, error: "invalid_verdict" }, { status: 400 });
  }

  const { saveExhibitCoaching } = await import("@/lib/ops/studio/director/coaching");
  const record = await saveExhibitCoaching({
    rvtr,
    exhibitId: input.exhibitId,
    verdict: input.verdict as "perfect" | "good" | "wrong",
    reasons: Array.isArray(input.reasons) ? input.reasons : [],
    note: input.note ?? null,
    frameAssetId: input.frameAssetId ?? null,
    frameCategory: input.frameCategory ?? null,
    source: "operator",
  });

  return NextResponse.json({ ok: true, record });
}
