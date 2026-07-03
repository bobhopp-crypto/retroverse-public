import { NextResponse } from "next/server";

import type { AcquisitionStatus } from "@/lib/ops/reconciliation-model";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  appendOpsActivity,
  loadOpsState,
  saveOpsState,
  type OpsAcquisitionRecord,
} from "@/lib/ops/ops-state-store";

export const dynamic = "force-dynamic";

type AcquisitionBody = {
  chartItemId?: string;
  graphTrackId?: number | null;
  artist?: string;
  title?: string;
  year?: number;
  peak?: number | null;
  status?: AcquisitionStatus;
};

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  let body: AcquisitionBody;
  try {
    body = (await request.json()) as AcquisitionBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const chartItemId = body.chartItemId?.trim();
  const artist = body.artist?.trim();
  const title = body.title?.trim();
  const year = body.year ?? 1967;
  if (!chartItemId || !artist || !title) {
    return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const state = await loadOpsState();
  const existing = state.acquisitions[chartItemId];

  const record: OpsAcquisitionRecord = {
    id: existing?.id || `acq-${chartItemId}`,
    chartItemId,
    graphTrackId: body.graphTrackId ?? existing?.graphTrackId ?? null,
    artist,
    title,
    year,
    peak: body.peak ?? existing?.peak ?? null,
    status: body.status || existing?.status || "queued",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  state.acquisitions[chartItemId] = record;
  appendOpsActivity(state, {
    entity: `${artist} — ${title}`,
    action: `acquisition.${record.status}`,
    source: "ops/reconciliation-state",
    status: "ok",
  });
  await saveOpsState(state);

  return NextResponse.json({ ok: true, record });
}

export async function PATCH(request: Request) {
  return POST(request);
}
