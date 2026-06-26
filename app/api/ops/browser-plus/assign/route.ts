import { NextResponse } from "next/server";

import { assignVdjLabelByFilePath } from "@/lib/ops/browser-plus/vdj-label-write";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { filePath?: string; rvtr?: string };
  try {
    body = (await request.json()) as { filePath?: string; rvtr?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const filePath = body.filePath?.trim() ?? "";
  const rvtr = body.rvtr?.trim().toUpperCase() ?? "";

  if (!filePath || !rvtr) {
    return NextResponse.json({ ok: false, error: "filePath and rvtr required" }, { status: 400 });
  }

  try {
    const result = await assignVdjLabelByFilePath(filePath, rvtr);
    return NextResponse.json({ ok: result.ok, result });
  } catch (err) {
    console.error("[ops/browser-plus/assign POST]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Assign failed" },
      { status: 500 },
    );
  }
}
