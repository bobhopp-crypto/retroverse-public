import { NextResponse } from "next/server";

import { runV2PocComparison, v2PocFileUrl } from "@/lib/ops/content-creator/v2-poc-run";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { parseSecondaryLineWithLegacy } from "@/lib/ops/content-creator/parse-fields";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import { normalizeVisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;

  const event = typeof body.event === "string" ? body.event : CONTENT_CREATOR_DEFAULTS.event;
  const venue = typeof body.venue === "string" ? body.venue : CONTENT_CREATOR_DEFAULTS.venue;
  const date = typeof body.date === "string" ? body.date : CONTENT_CREATOR_DEFAULTS.date;
  const secondaryLine = parseSecondaryLineWithLegacy(body);
  const passTypeLabel =
    typeof body.passTypeLabel === "string" ? body.passTypeLabel : CONTENT_CREATOR_DEFAULTS.passTypeLabel;
  const qrUrl = typeof body.qrUrl === "string" ? body.qrUrl : CONTENT_CREATOR_DEFAULTS.qrUrl;
  const eraSlug = typeof body.eraSlug === "string" ? body.eraSlug : "1982-1985";

  let visualWorldId = normalizeVisualWorldId(
    typeof body.visualWorldId === "string" ? body.visualWorldId : null,
  );
  if (!visualWorldId) {
    const profiles = await listRvbrProfiles();
    const profile = profiles.find((p) => p.slug === eraSlug) ?? null;
    visualWorldId = resolveVisualWorldFromRvbr(profile);
  }

  try {
    const result = await runV2PocComparison({
      event,
      venue,
      date,
      secondaryLine,
      passTypeLabel,
      qrUrl,
      visualWorldId,
    });

    return NextResponse.json({
      ok: true,
      runId: result.runId,
      runDir: result.runDir,
      provider: result.provider,
      exportZipUrl: v2PocFileUrl(result.runId, result.exportZipFilename),
      qrVerification: result.qrVerification,
      artifacts: result.artifacts.map((a) => ({
        ...a,
        url: v2PocFileUrl(result.runId, a.filename),
        path: undefined,
      })),
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "v2_poc_failed";
    console.error("[v2-poc]", message, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
