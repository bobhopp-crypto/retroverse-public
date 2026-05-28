import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { rollbackRvalCover } from "@/lib/rv12/rollback-rval";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: { rval?: string; actor?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await rollbackRvalCover(body.rval ?? "", body.actor ?? "ops/covers-ui");
  if (!result.ok) {
    const status = result.code === "writes_disabled" ? 403 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
