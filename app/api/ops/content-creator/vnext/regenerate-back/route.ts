import { NextResponse } from "next/server";

import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { parseCreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import { runVNextRegenerateBack, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

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

  const backFields = {
    event: typeof body.backEvent === "string" ? body.backEvent : CONTENT_CREATOR_DEFAULTS.event,
    venue: typeof body.backVenue === "string" ? body.backVenue : CONTENT_CREATOR_DEFAULTS.venue,
    date: typeof body.backDate === "string" ? body.backDate : CONTENT_CREATOR_DEFAULTS.date,
    featuredYears: Array.isArray(body.backFeaturedYears)
      ? body.backFeaturedYears.filter((y): y is number => typeof y === "number")
      : [...CONTENT_CREATOR_DEFAULTS.featuredYears],
    passTypeLabel: normalizePassTypeLabel(
      typeof body.backPassTypeLabel === "string"
        ? body.backPassTypeLabel
        : CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    ),
    qrUrl: typeof body.backQrUrl === "string" ? body.backQrUrl : CONTENT_CREATOR_DEFAULTS.qrUrl,
  };

  try {
    const manifest = await runVNextRegenerateBack({
      runId,
      profile,
      backFields,
      creativeSettings: parseCreativeDirectionSettings(body),
    });
    return NextResponse.json({
      ok: true,
      runId: manifest.runId,
      frontUrl: vNextFileUrl(manifest.runId, manifest.frontFilename),
      backUrl: vNextFileUrl(manifest.runId, manifest.backFilename),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "regenerate_back_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
