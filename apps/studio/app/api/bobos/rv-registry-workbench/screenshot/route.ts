import { NextResponse } from "next/server";

import {
  captureWorkbenchScreenshot,
  readWorkbenchScreenshot,
} from "@/lib/bobos/rv-registry-workbench";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function rvIdFrom(req: Request): string {
  const url = new URL(req.url);
  return (url.searchParams.get("id") ?? "").trim().toUpperCase();
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rvId = rvIdFrom(req);
  if (!rvId) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const buffer = await readWorkbenchScreenshot(rvId);
  if (!buffer) {
    return new NextResponse("Screenshot not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { rvId?: string };
    const rvId = (body.rvId ?? rvIdFrom(req)).trim().toUpperCase();
    if (!rvId) {
      return NextResponse.json({ error: "Missing rvId" }, { status: 400 });
    }

    const result = await captureWorkbenchScreenshot(rvId);
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capture failed";
    return NextResponse.json(
      {
        ok: false,
        rvId: "",
        path: null,
        url: null,
        attemptedUrl: null,
        finalUrl: null,
        consoleErrors: [],
        error: message,
      },
      { status: 500 },
    );
  }
}
