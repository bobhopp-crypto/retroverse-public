import { NextResponse } from "next/server";

import {
  approveSongPackage,
  buildCardsFromReview,
  patchSongPackage,
  processSong,
} from "@/lib/ops/intelligence/process-song";
import { loadPackageDiagnostics } from "@/lib/ops/intelligence/package-diagnostics";
import { deleteSongPackage, loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ rvtr: string }> };

export async function GET(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  const pkg = await loadSongPackage(rvtr);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "package_not_found" }, { status: 404 });
  }

  const diagnostics = await loadPackageDiagnostics(pkg);
  return NextResponse.json({ ok: true, package: pkg, diagnostics });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = body.action as string | undefined;

  if (action === "approve") {
    const pkg = await approveSongPackage(rvtr);
    if (!pkg) {
      return NextResponse.json({ ok: false, error: "package_not_found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, package: pkg });
  }

  if (action === "build_cards") {
    const result = await buildCardsFromReview(rvtr);
    if (!result.ok || !result.package) {
      return NextResponse.json(
        { ok: false, error: result.error, package: result.package },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, package: result.package });
  }

  const patch = {
    candidateFacts: body.candidateFacts as Parameters<typeof patchSongPackage>[1]["candidateFacts"],
    candidateStories: body.candidateStories as Parameters<typeof patchSongPackage>[1]["candidateStories"],
    storyCards: body.storyCards as Parameters<typeof patchSongPackage>[1]["storyCards"],
    issueFlags: body.issueFlags as Parameters<typeof patchSongPackage>[1]["issueFlags"],
  };

  const hasPatch = Object.values(patch).some((v) => v !== undefined);
  if (!hasPatch) {
    return NextResponse.json({ ok: false, error: "no_patch_fields" }, { status: 400 });
  }

  const filtered = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as Parameters<typeof patchSongPackage>[1];

  const pkg = await patchSongPackage(rvtr, filtered);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "package_not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, package: pkg });
}

export async function POST(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  const existing = await loadSongPackage(rvtr);
  if (existing?.status === "processing") {
    return NextResponse.json({ ok: false, error: "already_processing" }, { status: 409 });
  }

  await deleteSongPackage(rvtr);
  const result = await processSong(rvtr);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, package: result.package }, { status: 500 });
  }

  const diagnostics = await loadPackageDiagnostics(result.package);
  return NextResponse.json({ ok: true, package: result.package, diagnostics });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const { rvtr } = await params;
  const deleted = await deleteSongPackage(rvtr);
  return NextResponse.json({ ok: true, deleted });
}
