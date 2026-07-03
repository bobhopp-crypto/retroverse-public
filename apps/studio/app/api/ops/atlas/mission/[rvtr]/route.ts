import { NextResponse } from "next/server";

import { loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, workspace: bundle.workspace, coverUrl: bundle.coverUrl });
}

export async function POST(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, workspace: bundle.workspace, coverUrl: bundle.coverUrl });
}
