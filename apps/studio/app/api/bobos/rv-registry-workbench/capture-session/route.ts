import { NextResponse } from "next/server";

import {
  getCaptureSessionSnapshot,
  openCaptureBrowser,
  refreshCaptureSessionStatus,
  testCaptureSession,
} from "@/lib/bobos/rv-registry-workbench";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  const session = await getCaptureSessionSnapshot();
  return NextResponse.json({ session });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = (body.action ?? "").trim().toLowerCase();

    if (action === "open") {
      const session = await openCaptureBrowser();
      return NextResponse.json({ ok: true, session });
    }
    if (action === "test") {
      const session = await testCaptureSession();
      return NextResponse.json({ ok: session.ok, session });
    }
    if (action === "refresh") {
      const session = await refreshCaptureSessionStatus();
      return NextResponse.json({ ok: session.status === "ready", session });
    }

    return NextResponse.json(
      { error: "Unknown action. Use open | test | refresh." },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capture session action failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
