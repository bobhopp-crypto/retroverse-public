import { NextResponse } from "next/server";

import {
  generateCollectorCardArtwork,
  loadCollectorArtworkFile,
  updateCollectorArtworkSelection,
  type CollectorArtworkConcept,
} from "@/lib/ops/content-creator/collector-card-artwork";
import {
  normalizeCollectorCardContent,
  normalizeCollectorCardPresentation,
} from "@/lib/ops/content-creator/collector-card";
import { artworkErrorJson } from "@/lib/ops/creative-lab/artwork/provider-error";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function artworkConcept(raw: unknown): CollectorArtworkConcept | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const id = source.id;
  if (
    id !== "memory-object" &&
    id !== "environment" &&
    id !== "cultural-artifact" &&
    id !== "symbolic-metaphor"
  ) {
    return null;
  }
  return {
    id,
    label: typeof source.label === "string" ? source.label : id,
    value: typeof source.value === "string" ? source.value : "",
  };
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "load";
    const content = normalizeCollectorCardContent(body.collectorCardContent);
    const presentation = normalizeCollectorCardPresentation(body.collectorCardPresentation);

    if (action === "load") {
      const file = await loadCollectorArtworkFile(content, presentation);
      return NextResponse.json({ ok: true, file });
    }

    if (action === "generate") {
      const file = await generateCollectorCardArtwork({
        content,
        presentation,
        concept: artworkConcept(body.selectedConcept),
        selectedStyle: typeof body.selectedStyle === "string" ? body.selectedStyle : "retroverse-signature",
        brandingChoice: typeof body.brandingChoice === "string" ? body.brandingChoice : "retroverse",
      });
      return NextResponse.json({ ok: true, file });
    }

    if (action === "favorite" || action === "approve") {
      const file = await updateCollectorArtworkSelection({
        content,
        presentation,
        favoriteVariationId: typeof body.favoriteVariationId === "string" ? body.favoriteVariationId : undefined,
        approve: action === "approve",
      });
      return NextResponse.json({ ok: true, file });
    }

    return NextResponse.json({ error: "unknown_action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(artworkErrorJson(e), { status: 500 });
  }
}
