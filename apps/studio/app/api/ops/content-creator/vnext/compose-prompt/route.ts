import { NextResponse } from "next/server";

import { composeRvbrPrompt } from "@/lib/creative/rvbr-prompt-engine";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { parseCreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import { parseSecondaryLineWithLegacy } from "@/lib/ops/content-creator/parse-fields";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import type { ArtDirectorFields } from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import {
  normalizeCollectorCardContent,
  normalizeCollectorCardPresentation,
} from "@/lib/ops/content-creator/collector-card";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseFields(body: Record<string, unknown>): ArtDirectorFields {
  const fields: ArtDirectorFields = {
    event: typeof body.event === "string" ? body.event : CONTENT_CREATOR_DEFAULTS.event,
    venue: typeof body.venue === "string" ? body.venue : CONTENT_CREATOR_DEFAULTS.venue,
    date: typeof body.date === "string" ? body.date : CONTENT_CREATOR_DEFAULTS.date,
    secondaryLine: parseSecondaryLineWithLegacy(body),
    passTypeLabel: normalizePassTypeLabel(
      typeof body.passTypeLabel === "string"
        ? body.passTypeLabel
        : CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    ),
    qrUrl: typeof body.qrUrl === "string" ? body.qrUrl : CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
  if (body.artifact === "collector-card") {
    fields.collectorCardContent = normalizeCollectorCardContent(body.collectorCardContent);
    fields.collectorCardPresentation = normalizeCollectorCardPresentation(body.collectorCardPresentation);
  }
  return fields;
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";
  const side = body.side === "back" ? "back" : "front";
  const artifact = (body.artifact as ContentArtifactType) ?? "pass";
  const compositionSeed =
    typeof body.compositionSeed === "number" ? body.compositionSeed : Date.now();

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  const fields = parseFields(body);
  const settings = parseCreativeDirectionSettings(body);
  const frontSummary =
    typeof body.frontSummary === "string"
      ? body.frontSummary
      : `${profile.name} · ${settings.creativeDirection} · seed ${compositionSeed}`;

  const composed = composeRvbrPrompt({
    side,
    profile,
    fields,
    settings,
    artifactType: artifact,
    compositionSeed,
    frontSummary: side === "back" ? frontSummary : undefined,
  });

  return NextResponse.json({
    ok: true,
    side,
    finalPrompt: composed.finalPrompt,
    debugBreakdown: composed.debugBreakdown,
    qualityScores: composed.qualityScores,
    promptMetrics: composed.promptMetrics,
  });
}
