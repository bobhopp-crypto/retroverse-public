import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { patchSongPackage } from "@/lib/ops/intelligence/process-song";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import type { CandidateFact, CandidateStory } from "@/lib/ops/intelligence/song-package-types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { rvtr?: string; text?: string };
  try {
    body = (await req.json()) as { rvtr?: string; text?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const rvtr = body.rvtr?.trim().toUpperCase() ?? "";
  const text = body.text?.trim() ?? "";
  if (!/^RVTR\d{6}$/.test(rvtr)) {
    return NextResponse.json({ ok: false, error: "invalid_rvtr" }, { status: 400 });
  }
  if (!text) {
    return NextResponse.json({ ok: false, error: "empty_text" }, { status: 400 });
  }

  const pkg = await loadSongPackage(rvtr);
  if (!pkg) {
    return NextResponse.json({ ok: false, error: "package_not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const factId = randomUUID();
  const fact: CandidateFact = {
    id: factId,
    category: "trivia",
    factText: text,
    sourceType: "operator",
    sourceId: "browser-plus-2",
    sourceUrl: null,
    sourceExcerpt: text,
    excerptAnchor: text.slice(0, 40),
    confidence: 1,
    importance: 0.8,
    locked: false,
    extractionMethod: "operator",
    reviewStatus: "approved",
    createdAt: now,
  };

  const story: CandidateStory = {
    id: randomUUID(),
    headline: text.length > 80 ? `${text.slice(0, 77)}…` : text,
    hookType: "surprise",
    primaryFactId: factId,
    supportingFactIds: [],
    headlineMethod: "operator",
    reviewStatus: "approved",
    rank: pkg.candidateStories.length + pkg.storyCards.filter((c) => c.rank > 0).length + 1,
    rankScore: 0.5,
    createdAt: now,
  };

  const saved = await patchSongPackage(rvtr, {
    candidateFacts: [...pkg.candidateFacts, fact],
    candidateStories: [...pkg.candidateStories, story],
  });

  if (!saved) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, package: saved });
}
