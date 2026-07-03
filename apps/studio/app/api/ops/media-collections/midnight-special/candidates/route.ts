import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { analyzeMidnightSpecialEpisode } from "@/lib/ops/media-collections/midnight-special/analyze-episode";
import {
  ensureEpisodePerformances,
  episodeManifestToCandidateShape,
} from "@/lib/ops/media-collections/midnight-special/performances";
import { resolveStructuredCollectionMode } from "@/lib/ops/media-collections/midnight-special/structured-mode";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  const episodeId = new URL(req.url).searchParams.get("episode")?.trim();
  if (!episodeId) {
    return NextResponse.json({ ok: false, error: "episode_required" }, { status: 400 });
  }

  const regenerate = new URL(req.url).searchParams.get("regenerate") === "1";
  const [analysis, structured, episodeManifest] = await Promise.all([
    analyzeMidnightSpecialEpisode(episodeId),
    resolveStructuredCollectionMode(episodeId),
    ensureEpisodePerformances(episodeId, regenerate),
  ]);

  if (!episodeManifest) {
    return NextResponse.json(
      { ok: false, error: "generation_failed", analysis },
      { status: 422 },
    );
  }

  return NextResponse.json({
    ok: true,
    analysis,
    manifest: episodeManifestToCandidateShape(episodeManifest),
    structured_mode: structured,
  });
}
