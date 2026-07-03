import { NextResponse } from "next/server";

import { findAuditMissionRow, loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import { applyHealingAlbumLink } from "@/lib/healing/apply-album-link";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { healingWritesEnabled } from "@/lib/track/album-link-recovery/guardrails";
import {
  type CandidateSourceKind,
} from "@/lib/track/album-link-recovery/types";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

type Body = {
  albumId?: unknown;
  position?: unknown;
  sequenceTitle?: unknown;
  confidence?: unknown;
  reasons?: unknown;
  sourceKind?: unknown;
};

function parseOptionalTrackPosition(value: unknown): number | null | undefined {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

const CANDIDATE_SOURCE_KINDS = [
  "same_artist_album",
  "tracklist_title_match",
  "tracklist_title_unlinked",
  "track_family_link",
  "compilation_title_match",
] as const satisfies readonly CandidateSourceKind[];

function parseSourceKind(value: unknown): CandidateSourceKind | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return (CANDIDATE_SOURCE_KINDS as readonly string[]).includes(trimmed)
    ? (trimmed as CandidateSourceKind)
    : undefined;
}

export async function POST(req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }
  if (!healingWritesEnabled()) {
    return NextResponse.json(
      {
        ok: false,
        code: "writes_disabled",
        message: "Set RETROVERSE_HEALING_APPLY=1 to enable album linking.",
      },
      { status: 403 },
    );
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

  const albumId = Number(body.albumId);
  if (!Number.isFinite(albumId) || albumId <= 0) {
    return NextResponse.json({ ok: false, error: "albumId required" }, { status: 400 });
  }
  const position = parseOptionalTrackPosition(body.position);
  if (position === undefined) {
    return NextResponse.json({ ok: false, error: "invalid position" }, { status: 400 });
  }
  const sequenceTitle =
    typeof body.sequenceTitle === "string" ? body.sequenceTitle.trim() : "";
  if (!sequenceTitle) {
    return NextResponse.json({ ok: false, error: "sequenceTitle required" }, { status: 400 });
  }
  const reasons = Array.isArray(body.reasons)
    ? body.reasons.filter((r): r is string => typeof r === "string")
    : [];
  if (reasons.length === 0) {
    return NextResponse.json({ ok: false, error: "reasons required" }, { status: 400 });
  }
  const sourceKind = parseSourceKind(body.sourceKind);
  if (!sourceKind) {
    return NextResponse.json({ ok: false, error: "sourceKind required" }, { status: 400 });
  }

  const result = await applyHealingAlbumLink(
    {
      rvtr,
      albumId,
      position,
      sequenceTitle,
      confidence: Number(body.confidence) || 0,
      reasons,
      sourceKind,
    },
    "ops/atlas/mission",
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, code: result.code, message: result.message },
      { status: 409 },
    );
  }

  const bundle = await loadMissionWorkspaceBundle(rvtr);
  if (!bundle) {
    return NextResponse.json({ ok: false, error: "mission_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    workspace: bundle.workspace,
    coverUrl: bundle.coverUrl,
    proposalId: result.proposalId,
  });
}
