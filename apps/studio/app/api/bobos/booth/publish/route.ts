import { NextResponse } from "next/server";

import { publishBoothOwnership } from "@/lib/bobos/booth/publish-ownership";
import type { BoothState } from "@/lib/bobos/booth/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  booth: BoothState;
  vdj: {
    artist: string;
    title: string;
    rvtr: string | null;
    coverUrl: string | null;
  } | null;
  ownershipAt: number;
};

function confidenceFromPush(status: string): {
  localConfidence: "Confirmed" | "Unconfirmed" | "Fault";
  publicConfidence: "Confirmed" | "Unconfirmed" | "Fault";
} {
  if (status === "synced") {
    return { localConfidence: "Confirmed", publicConfidence: "Confirmed" };
  }
  if (status === "unconfigured") {
    return { localConfidence: "Fault", publicConfidence: "Fault" };
  }
  return { localConfidence: "Confirmed", publicConfidence: "Fault" };
}

export async function POST(request: Request) {
  if (!shouldAllowOpsRoutes()) {
    return NextResponse.json({ error: "The Booth is localhost-only." }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.booth || typeof body.ownershipAt !== "number") {
    return NextResponse.json({ error: "booth + ownershipAt required" }, { status: 400 });
  }

  const result = await publishBoothOwnership(body.booth, body.vdj ?? null, body.ownershipAt);
  const confidence = confidenceFromPush(result.push.status);

  return NextResponse.json({
    push: result.push,
    publishedKey: result.publishedKey,
    localConfidence: confidence.localConfidence,
    publicConfidence: confidence.publicConfidence,
    statusMessage:
      result.push.status === "synced"
        ? `Published ${result.publishedKey}`
        : `Publish ${result.push.status}: ${result.push.detail}`,
  });
}
