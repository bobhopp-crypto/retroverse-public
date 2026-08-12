import { NextResponse } from "next/server";

import {
  buildWorkbenchCatalog,
  upsertWorkbenchReview,
  type WorkbenchDecision,
} from "@/lib/bobos/rv-registry-workbench";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  const catalog = await buildWorkbenchCatalog();
  return NextResponse.json(catalog);
}

export async function PATCH(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      rvId?: string;
      decision?: WorkbenchDecision | null;
      notes?: string;
      viewed?: boolean;
    };

    const rvId = typeof body.rvId === "string" ? body.rvId.trim() : "";
    if (!rvId) {
      return NextResponse.json({ error: "Missing rvId" }, { status: 400 });
    }

    if (body.decision !== undefined && body.decision !== null) {
      const allowed: WorkbenchDecision[] = ["keep", "rename", "move", "retire", "review-later"];
      if (!allowed.includes(body.decision)) {
        return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
      }
    }

    if (body.viewed !== undefined && typeof body.viewed !== "boolean") {
      return NextResponse.json({ error: "Invalid viewed flag" }, { status: 400 });
    }

    const review = await upsertWorkbenchReview(rvId, {
      decision: body.decision,
      notes: body.notes,
      viewed: body.viewed,
    });

    return NextResponse.json({ ok: true, rvId, review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not save review";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
