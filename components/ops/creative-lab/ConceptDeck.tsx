"use client";

import { useMemo } from "react";

import { artDirectionByKey } from "@/lib/ops/creative-lab/art-directions";
import { refinementsForArtDirection } from "@/lib/ops/creative-lab/art-direction-refinements";
import { buildRefinementArtBoardSpec } from "@/lib/ops/creative-lab/art-board-spec";
import type { CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";

import { ArtDirectionBoard } from "./ArtDirectionBoard";
import { ArtDirectionCard } from "./ArtDirectionCard";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  busy?: boolean;
  onSelectWinner: (promptId: string) => void;
  onGenerateRefinement: () => void;
  onSelectVariation: (index: number) => void;
  onGenerateArtwork: () => void;
};

export function ConceptDeck(props: Props) {
  const { prompts, project, busy, onSelectWinner, onGenerateRefinement, onSelectVariation, onGenerateArtwork } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const round1Concepts = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const selectedId = project.selectedConceptPromptId ?? null;
  const winningPrompt = round1Concepts.find((p) => p.id === selectedId) ?? null;
  const winningDirection = winningPrompt ? artDirectionByKey(winningPrompt.variationKey) : null;
  const refinementGenerated = project.refinementGenerated === true;
  const refinements = project.refinementVariations ?? [];
  const selectedVariation = project.selectedVariationIndex ?? null;
  const artTreatments = winningDirection ? refinementsForArtDirection(winningDirection.id) : [];

  if (!round1Concepts.length) return null;

  return (
    <section className="cl-concept-deck cl-art-deck" aria-label="Art direction workflow">
      {!refinementGenerated ? (
        <>
          <header className="cl-concept-deck__head">
            <h2>Choose a visual world</h2>
            <p className="ops-dim">Four illustrated directions — pick the emotional tone you want to refine.</p>
          </header>
          <div className="cl-concept-deck__grid cl-art-deck__grid">
            {round1Concepts.map((p) => {
              const key = p.variationKey ?? "A";
              const isWinner = selectedId === p.id;
              return (
                <ArtDirectionCard
                  key={p.id}
                  variationKey={key}
                  project={project}
                  selected={isWinner}
                  onSelect={() => onSelectWinner(p.id)}
                  selectLabel="USE THIS DIRECTION"
                  selectedLabel="✓ DIRECTION SELECTED"
                />
              );
            })}
          </div>

          {winningPrompt && winningDirection ? (
            <section className="cl-refine-cta">
              <h3 className="cl-refine-cta__title">REFINE THIS DIRECTION</h3>
              <p className="cl-refine-cta__desc">
                <strong>{winningDirection.title}</strong> selected — generate 8 illustrated refinements inside the
                same art family.
              </p>
              <button
                type="button"
                className="cl-refine-cta__btn"
                disabled={busy}
                onClick={onGenerateRefinement}
              >
                GENERATE 8 REFINEMENTS
              </button>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <header className="cl-concept-deck__head">
            <h2>Refine this direction</h2>
            <p className="cl-concept-deck__inherit ops-dim">
              Staying inside <strong>{winningDirection?.title}</strong>
              {project.event ? <> · {project.event}</> : null}
            </p>
          </header>
          <div className="cl-concept-deck__grid cl-concept-deck__grid--refine cl-art-deck__grid--refine">
            {refinements.map((variation) => {
              const treatment =
                artTreatments.find((t) => t.id === variation.treatmentId) ?? artTreatments[variation.index - 1];
              const spec = buildRefinementArtBoardSpec(
                project,
                winningDirection!.id,
                treatment,
                variation.index,
              );
              const isWinner = selectedVariation === variation.index;
              return (
                <article
                  key={variation.id}
                  className={`cl-art-card cl-art-card--refine${isWinner ? " cl-art-card--selected" : ""}`}
                >
                  <div className="cl-art-card__frame">
                    <ArtDirectionBoard spec={spec} compact />
                  </div>
                  <div className="cl-art-card__body cl-art-card__body--compact">
                    <h3>{variation.treatmentLabel}</h3>
                    <p className="cl-art-card__refine-meta ops-dim">
                      {treatment.borderTreatment.replace(/-/g, " ")} · {treatment.typography.replace(/-/g, " ")}
                    </p>
                    <button
                      type="button"
                      className={`cl-art-card__select${isWinner ? " cl-art-card__select--on" : ""}`}
                      disabled={busy}
                      onClick={() => onSelectVariation(variation.index)}
                    >
                      {isWinner ? "✓ VERSION SELECTED" : "USE THIS VERSION"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {selectedVariation ? (
            <section className="cl-art-winner">
              <h3>Version selected</h3>
              <p>
                <strong>{winningDirection?.title}</strong> · Version {selectedVariation} — ready to generate artwork.
              </p>
              <button
                type="button"
                className="cl-art-generate-btn"
                disabled={busy}
                onClick={onGenerateArtwork}
              >
                GENERATE ARTWORK
              </button>
            </section>
          ) : null}
        </>
      )}
    </section>
  );
}
