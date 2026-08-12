import { NextResponse } from "next/server";

import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { parseSecondaryLineWithLegacy } from "@/lib/ops/content-creator/parse-fields";
import { parseCreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import { runVNextRegenerateFront, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import { artworkErrorJson } from "@/lib/ops/creative-lab/artwork/provider-error";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";
import { styleDirectiveForColorScheme } from "@/lib/bobos/project-zero/creative-brief";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const runId = typeof body.runId === "string" ? body.runId : "";
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";

  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  const frontFields = {
    event: typeof body.frontEvent === "string" ? body.frontEvent : CONTENT_CREATOR_DEFAULTS.event,
    venue: typeof body.frontVenue === "string" ? body.frontVenue : CONTENT_CREATOR_DEFAULTS.venue,
    date: typeof body.frontDate === "string" ? body.frontDate : CONTENT_CREATOR_DEFAULTS.date,
    secondaryLine: parseSecondaryLineWithLegacy(body, {
      line: "frontSecondaryLine",
      legacyYears: "frontFeaturedYears",
    }),
    passTypeLabel: normalizePassTypeLabel(
      typeof body.frontPassTypeLabel === "string"
        ? body.frontPassTypeLabel
        : CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    ),
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };

  try {
    const manifest = await runVNextRegenerateFront({
      runId,
      profile,
      frontFields,
      creativeSettings: parseCreativeDirectionSettings(body),
      styleDirective:
        typeof body.colorScheme === "string" ? styleDirectiveForColorScheme(body.colorScheme) : undefined,
    });
    return NextResponse.json({
      ok: true,
      runId: manifest.runId,
      frontUrl: vNextFileUrl(manifest.runId, manifest.frontFilename),
      backUrl: vNextFileUrl(manifest.runId, manifest.backFilename),
    });
  } catch (e) {
    const payload = artworkErrorJson(e);
    console.error("[vnext:regenerate-front]", payload, e);
    return NextResponse.json(payload, { status: 502 });
  }
}
