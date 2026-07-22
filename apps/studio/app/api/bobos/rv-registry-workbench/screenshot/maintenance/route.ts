import { NextResponse } from "next/server";

import {
  findInvalidScreenshots,
  recaptureInvalidScreenshots,
} from "@/lib/bobos/rv-registry-workbench";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string };
    const action = (body.action ?? "").trim().toLowerCase();

    if (action === "find-invalid") {
      const result = await findInvalidScreenshots();
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "recapture-invalid") {
      const result = await recaptureInvalidScreenshots();
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json(
      { error: "Unknown action. Use find-invalid | recapture-invalid." },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Maintenance action failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
