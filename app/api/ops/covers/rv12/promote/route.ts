import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { promoteRvalCover } from "@/lib/rv12/promote-rval";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: {
    rval?: string;
    rv12Id?: string;
    actor?: string;
    auditReason?: string;
    forceTrustedOverride?: boolean;
    forceReason?: string;
    trustTier?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const result = await promoteRvalCover({
    rval: body.rval ?? "",
    rv12Id: body.rv12Id ?? "",
    actor: body.actor ?? "ops/covers-ui",
    auditReason: body.auditReason,
    forceTrustedOverride: body.forceTrustedOverride,
    forceReason: body.forceReason ?? null,
    trustTier: body.trustTier,
  });

  if (!result.ok) {
    const status = result.code === "writes_disabled" ? 403 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
