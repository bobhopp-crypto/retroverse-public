"use client";

import { useMemo } from "react";

import { compositionForKey } from "@/lib/ops/creative-lab/concept-compositions";
import type { CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";
import { visualWorldById } from "@/lib/ops/creative-lab/visual-worlds";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  busy?: boolean;
  onSelectWinner: (promptId: string) => void;
  onGenerateRefinement: () => void;
  onSelectVariation: (index: number) => void;
};

function assetUrl(project: CreativeLabProjectFile, assetId: string): string {
  const slug = project.folderSlug || project.id;
  return `/api/ops/creative-lab/projects/${encodeURIComponent(slug)}/assets/${encodeURIComponent(assetId)}`;
}

function assetForPrompt(project: CreativeLabProjectFile, prompt: GeneratedPrompt) {
  if (prompt.assetId) return project.assets.find((a) => a.id === prompt.assetId);
  return project.assets.find((a) => a.promptId === prompt.id && a.filePath?.endsWith(".png"));
}

export function ConceptDeck(props: Props) {
  const { prompts, project, busy, onSelectWinner, onGenerateRefinement, onSelectVariation } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const round1Concepts = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const selectedId = project.selectedConceptPromptId ?? null;
  const winningPrompt = round1Concepts.find((p) => p.id === selectedId) ?? null;
  const world = visualWorldById(project.selectedArtDirectionId);
  const refinementGenerated = project.refinementGenerated === true;
  const refinements = project.refinementVariations ?? [];
  const selectedVariation = project.selectedVariationIndex ?? null;

  if (!round1Concepts.length) return null;

  return (
    <section className="cl-concept-deck cl-pass-deck" aria-label="Pass concept workflow">
      {!refinementGenerated ? (
        <>
          <header className="cl-concept-deck__head">
            <h2>Concept A–D</h2>
            <p className="ops-dim">
              Four illustrated passes in <strong>{world.title}</strong> — pick the direction to refine.
            </p>
          </header>
          <div className="cl-pass-deck__grid">
            {round1Concepts.map((p) => {
              const key = p.variationKey ?? "A";
              const comp = compositionForKey(key);
              const asset = assetForPrompt(project, p);
              const isWinner = selectedId === p.id;
              return (
                <article
                  key={p.id}
                  className={`cl-pass-card${isWinner ? " cl-pass-card--selected" : ""}`}
                >
                  <div className="cl-pass-card__frame">
                    {asset?.filePath?.endsWith(".png") && asset.id ? (
                      <img
                        src={assetUrl(project, asset.id)}
                        alt={`Concept ${key} — ${comp.label}`}
                        className="cl-pass-card__img"
                      />
                    ) : (
                      <div className="cl-pass-card__loading">Generating…</div>
                    )}
                    <span className="cl-pass-card__key">Concept {key}</span>
                  </div>
                  <div className="cl-pass-card__body">
                    <h3>{comp.label}</h3>
                    <p className="ops-dim">{p.conceptSummary}</p>
                    <button
                      type="button"
                      className={`cl-pass-card__select${isWinner ? " cl-pass-card__select--on" : ""}`}
                      disabled={busy || !asset}
                      onClick={() => onSelectWinner(p.id)}
                    >
                      {isWinner ? "✓ CONCEPT SELECTED" : "USE THIS CONCEPT"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {winningPrompt ? (
            <section className="cl-refine-cta">
              <h3 className="cl-refine-cta__title">REFINE THIS CONCEPT</h3>
              <p className="cl-refine-cta__desc">
                <strong>{compositionForKey(winningPrompt.variationKey ?? "A").label}</strong> in{" "}
                <strong>{world.title}</strong> — generate 8 illustrated variations.
              </p>
              <button
                type="button"
                className="cl-refine-cta__btn"
                disabled={busy}
                onClick={onGenerateRefinement}
              >
                GENERATE 8 VARIATIONS
              </button>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <header className="cl-concept-deck__head">
            <h2>Pick your pass</h2>
            <p className="cl-concept-deck__inherit ops-dim">
              Same world · same composition · varied borders, color, type, and ornament
            </p>
          </header>
          <div className="cl-pass-deck__grid cl-pass-deck__grid--refine">
            {refinements.map((variation) => {
              const asset = variation.assetId
                ? project.assets.find((a) => a.id === variation.assetId)
                : undefined;
              const isWinner = selectedVariation === variation.index;
              return (
                <article
                  key={variation.id}
                  className={`cl-pass-card cl-pass-card--refine${isWinner ? " cl-pass-card--selected" : ""}`}
                >
                  <div className="cl-pass-card__frame">
                    {asset?.filePath?.endsWith(".png") && asset.id ? (
                      <img
                        src={assetUrl(project, asset.id)}
                        alt={variation.treatmentLabel}
                        className="cl-pass-card__img"
                      />
                    ) : (
                      <div className="cl-pass-card__loading">Generating…</div>
                    )}
                    <span className="cl-pass-card__key">V{variation.index}</span>
                  </div>
                  <div className="cl-pass-card__body cl-pass-card__body--compact">
                    <h3>{variation.treatmentLabel}</h3>
                    <button
                      type="button"
                      className={`cl-pass-card__select${isWinner ? " cl-pass-card__select--on" : ""}`}
                      disabled={busy || !asset}
                      onClick={() => onSelectVariation(variation.index)}
                    >
                      {isWinner ? "✓ PASS SELECTED" : "USE THIS PASS"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {selectedVariation ? (
            <section className="cl-art-winner">
              <h3>Pass selected</h3>
              <p>
                <strong>{world.title}</strong> · Variation {selectedVariation} — approve in Asset Library or export
                from Advanced Workshop.
              </p>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
