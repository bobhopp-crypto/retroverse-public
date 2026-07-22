import { NextResponse } from "next/server";

import {
  freezeBoothProgramForTake,
  goLiveBoothProgram,
  restoreBoothProgram,
  transportBoothProgram,
  type BoothProgramTransportOp,
} from "@/lib/bobos/booth/program-control";
import type { BoothState } from "@/lib/bobos/booth/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  op: "go-live" | "next" | "previous" | "pause" | "resume" | "jump" | "freeze-take" | "restore-return";
  booth: BoothState;
  ownershipAt: number;
  itemId?: string;
  vdj?: {
    artist: string;
    title: string;
    rvtr: string | null;
    coverUrl: string | null;
  } | null;
};

function publishFields(result: Awaited<ReturnType<typeof goLiveBoothProgram>>) {
  if (!result.ok || !result.publish) {
    return {
      published: false,
      publishedKey: null as string | null,
      localConfidence: null as "Confirmed" | "Fault" | null,
      publicConfidence: null as "Confirmed" | "Fault" | null,
      statusMessage: null as string | null,
      skippedDuplicate: false,
    };
  }
  const push = result.publish.push;
  const conf =
    push.status === "synced"
      ? ({ local: "Confirmed" as const, public: "Confirmed" as const })
      : push.status === "unconfigured"
        ? ({ local: "Fault" as const, public: "Fault" as const })
        : ({ local: "Confirmed" as const, public: "Fault" as const });
  return {
    published: result.published,
    publishedKey: result.publish.publishedKey,
    localConfidence: conf.local,
    publicConfidence: conf.public,
    statusMessage:
      push.status === "synced"
        ? result.publish.skippedDuplicate
          ? `Idempotent ${result.publish.publishedKey}`
          : `Published ${result.publish.publishedKey}`
        : `Publish ${push.status}: ${push.detail}`,
    skippedDuplicate: result.publish.skippedDuplicate,
  };
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

  if (!body?.booth || !body.op || typeof body.ownershipAt !== "number") {
    return NextResponse.json({ error: "op, booth, ownershipAt required" }, { status: 400 });
  }

  if (body.op === "freeze-take") {
    const view = await freezeBoothProgramForTake();
    return NextResponse.json({ ok: true, view, published: false });
  }

  if (body.op === "go-live") {
    const result = await goLiveBoothProgram(body.booth, body.ownershipAt);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, view: result.view, ...publishFields(result) });
  }

  if (body.op === "restore-return") {
    const result = await restoreBoothProgram(body.booth, body.ownershipAt);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
    }
    return NextResponse.json({ ok: true, view: result.view, ...publishFields(result) });
  }

  let transportOp: BoothProgramTransportOp;
  if (body.op === "jump") {
    if (!body.itemId?.trim()) {
      return NextResponse.json({ error: "itemId required for JUMP" }, { status: 400 });
    }
    transportOp = { jump: body.itemId.trim() };
  } else if (
    body.op === "next" ||
    body.op === "previous" ||
    body.op === "pause" ||
    body.op === "resume"
  ) {
    transportOp = body.op;
  } else {
    return NextResponse.json({ error: `Unknown op ${body.op}` }, { status: 400 });
  }

  const result = await transportBoothProgram(
    body.booth,
    transportOp,
    body.ownershipAt,
    body.vdj ?? null,
  );
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true, view: result.view, ...publishFields(result) });
}
