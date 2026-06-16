import { NextResponse } from "next/server";

import { findAuditMissionRow, loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import {
  saveMissionAppearance,
  type AppearanceKind,
} from "@/lib/atlas/mission-appearances-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

type Body = {
  kind?: AppearanceKind;
  action?: "confirm" | "reject";
  candidateId?: string;
  label?: string;
  detail?: string | null;
};

export async function POST(req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr: rvtrParam } = await params;
  const rvtr = rvtrParam.trim().toUpperCase();
  const auditRow = await findAuditMissionRow(rvtr);
  if (!auditRow) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (body.kind !== "tv" && body.kind !== "movie") {
    return NextResponse.json({ ok: false, error: "invalid_kind" }, { status: 400 });
  }
  if (body.action !== "confirm" && body.action !== "reject") {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  const candidateId = body.candidateId?.trim() || "none";
  const label =
    body.label?.trim() ||
    (body.action === "reject" ? "No appearance" : "Confirmed match");

  await saveMissionAppearance({
    rvtr,
    kind: body.kind,
    candidateId,
    label,
    detail: body.detail ?? null,
    status: body.action === "confirm" ? "confirmed" : "rejected",
  });

  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    workspace: bundle.workspace,
    coverUrl: bundle.coverUrl,
  });
}
