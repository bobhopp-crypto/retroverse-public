import { NextResponse } from "next/server";

import { parseSecondaryLineWithLegacy } from "@/lib/ops/content-creator/parse-fields";
import { parseCreativeDirectionSettings } from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType } from "@/lib/ops/content-creator/types";
import { runVNextGenerate, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { normalizePassTypeLabel } from "@/lib/ops/creative-lab/pass-text-governance";
import type { ArtDirectorFields } from "@/lib/ops/content-creator/rvbr-art-director-prompt";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function parseFields(body: Record<string, unknown>, prefix?: "front" | "back"): ArtDirectorFields {
  const p = prefix ?? "";
  const cap = (f: string) => `${p}${f.charAt(0).toUpperCase()}${f.slice(1)}`;
  const raw = (f: string) => (prefix ? body[cap(f)] : body[f]);
  const passRaw =
    typeof raw("passTypeLabel") === "string" ? raw("passTypeLabel") : CONTENT_CREATOR_DEFAULTS.passTypeLabel;
  const qrRaw =
    prefix === "back"
      ? body.backQrUrl ?? body.qrUrl
      : body.qrUrl;
  const eventVal = raw("event");
  const venueVal = raw("venue");
  const dateVal = raw("date");
  const secondaryLine = prefix
    ? parseSecondaryLineWithLegacy(body, {
        line: `${prefix}SecondaryLine`,
        legacyYears: `${prefix}FeaturedYears`,
      })
    : parseSecondaryLineWithLegacy(body);
  return {
    event: typeof eventVal === "string" ? eventVal : CONTENT_CREATOR_DEFAULTS.event,
    venue: typeof venueVal === "string" ? venueVal : CONTENT_CREATOR_DEFAULTS.venue,
    date: typeof dateVal === "string" ? dateVal : CONTENT_CREATOR_DEFAULTS.date,
    secondaryLine,
    passTypeLabel: normalizePassTypeLabel(String(passRaw)),
    qrUrl: typeof qrRaw === "string" ? qrRaw : CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";
  const artifact = (body.artifact as ContentArtifactType) ?? "pass";

  if (artifact !== "pass") {
    return NextResponse.json({ error: "Only Pass is available" }, { status: 400 });
  }

  const profiles = await listRvbrProfiles();
  const profile = profiles.find((p) => p.slug === eraSlug) ?? profiles[0];
  if (!profile) return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });

  const top = parseFields(body);
  const frontFields = body.frontEvent ? parseFields(body, "front") : top;
  const backFields = body.backEvent ? parseFields(body, "back") : top;
  const creativeSettings = parseCreativeDirectionSettings(body);

  try {
    const manifest = await runVNextGenerate({
      profile,
      artifact,
      frontFields,
      backFields,
      creativeSettings,
    });
    return NextResponse.json({
      ok: true,
      runId: manifest.runId,
      frontUrl: vNextFileUrl(manifest.runId, manifest.frontFilename),
      backUrl: vNextFileUrl(manifest.runId, manifest.backFilename),
      promptInspector: manifest.promptInspector,
      qualityScores: manifest.promptInspector?.front.qualityScores,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "generate_failed";
    console.error("[vnext:generate]", message, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
