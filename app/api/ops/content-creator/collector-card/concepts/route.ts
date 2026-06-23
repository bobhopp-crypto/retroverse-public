import { NextResponse } from "next/server";

import {
  COLLECTOR_CONCEPT_IDS,
  evaluateCollectorTextConcepts,
  generateCollectorConcepts,
  generateCollectorTextConcepts,
  loadCollectorConceptFile,
  saveCollectorEvaluation,
  saveCollectorTextConcepts,
  saveCollectorConceptFile,
  type CollectorConceptEvaluationState,
  type CollectorConceptId,
  type CollectorConceptInput,
  type CollectorConceptProvider,
  type CollectorTextConceptProvider,
} from "@/lib/ops/content-creator/collector-card-concepts";
import {
  normalizeCollectorCardContent,
  normalizeCollectorCardPresentation,
} from "@/lib/ops/content-creator/collector-card";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function conceptId(raw: unknown): CollectorConceptId | undefined {
  return COLLECTOR_CONCEPT_IDS.includes(raw as CollectorConceptId) ? (raw as CollectorConceptId) : undefined;
}

function providerId(raw: unknown): CollectorConceptProvider {
  return raw === "local-placeholder" ? "local-placeholder" : "local-placeholder";
}

function textProviderId(raw: unknown): CollectorTextConceptProvider {
  return raw === "rule-based" ? "rule-based" : "ollama";
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const action = typeof body.action === "string" ? body.action : "generate";
  const content = normalizeCollectorCardContent(body.collectorCardContent);
  const presentation = normalizeCollectorCardPresentation(body.collectorCardPresentation);

  if (action === "load") {
    const file = await loadCollectorConceptFile(content, presentation);
    return NextResponse.json({ ok: true, file });
  }

  if (action === "generate-concepts") {
    const selectedStyle = typeof body.selectedStyle === "string" ? body.selectedStyle : "retroverse-signature";
    const brandingChoice = typeof body.brandingChoice === "string" ? body.brandingChoice : "retroverse";
    const generated = await generateCollectorTextConcepts({
      content,
      presentation,
      selectedStyle,
      brandingChoice,
      provider: textProviderId(body.conceptProvider),
    });
    const evaluation = await evaluateCollectorTextConcepts({
      content,
      presentation,
      concepts: generated.concepts,
      provider: generated.provider,
    });
    const file = await saveCollectorTextConcepts({
      content,
      presentation,
      selectedStyle,
      brandingChoice,
      concepts: generated.concepts,
      provider: generated.provider,
      model: generated.model,
      evaluation,
    });
    return NextResponse.json({
      ok: true,
      file,
      conceptDirections: generated.concepts,
      conceptProvider: generated.provider,
      conceptModel: generated.model,
    });
  }

  if (action === "favorite-concept") {
    const file = await loadCollectorConceptFile(content, presentation);
    if (!file) return NextResponse.json({ error: "concept_file_not_found" }, { status: 404 });
    const id = conceptId(body.conceptId);
    if (!id) return NextResponse.json({ error: "conceptId required" }, { status: 400 });
    const updated = await saveCollectorConceptFile({
      ...file,
      favoriteConceptId: id,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({
      ok: true,
      file: updated,
      conceptDirections: updated.conceptDirections ?? [],
      conceptProvider: updated.conceptProvider ?? "rule-based",
      conceptModel: updated.conceptModel ?? "",
    });
  }

  if (action === "save-evaluation") {
    const evaluation = body.evaluation as CollectorConceptEvaluationState | undefined;
    if (!evaluation || typeof evaluation !== "object") {
      return NextResponse.json({ error: "evaluation required" }, { status: 400 });
    }
    const file = await saveCollectorEvaluation({
      content,
      presentation,
      selectedStyle: typeof body.selectedStyle === "string" ? body.selectedStyle : "retroverse-signature",
      brandingChoice: typeof body.brandingChoice === "string" ? body.brandingChoice : "retroverse",
      evaluation,
    });
    return NextResponse.json({ ok: true, file });
  }

  if (action === "favorite" || action === "best") {
    const file = await loadCollectorConceptFile(content, presentation);
    if (!file) return NextResponse.json({ error: "concept_file_not_found" }, { status: 404 });
    const id = conceptId(body.conceptId);
    if (!id) return NextResponse.json({ error: "conceptId required" }, { status: 400 });
    const concepts = file.concepts.map((concept) => ({
      ...concept,
      favorite: action === "favorite" ? concept.id === id : concept.favorite,
    }));
    const updated = await saveCollectorConceptFile({
      ...file,
      concepts,
      favoriteConceptId: action === "favorite" ? id : file.favoriteConceptId,
      bestConceptId: action === "best" ? id : file.bestConceptId,
      updatedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, file: updated });
  }

  const concepts = Array.isArray(body.concepts) ? (body.concepts as CollectorConceptInput[]) : [];
  if (concepts.length !== 4) return NextResponse.json({ error: "exactly_four_concepts_required" }, { status: 400 });

  const file = await generateCollectorConcepts({
    content,
    presentation,
    concepts,
    selectedStyle: typeof body.selectedStyle === "string" ? body.selectedStyle : "retroverse-signature",
    brandingChoice: typeof body.brandingChoice === "string" ? body.brandingChoice : "retroverse",
    provider: providerId(body.provider),
    regenerateConceptId: conceptId(body.regenerateConceptId),
  });

  return NextResponse.json({ ok: true, file });
}
