"use client";

import { useMemo, useState } from "react";

import { strategyById } from "@/lib/ops/creative-lab/concept-strategies";
import { buildPassMockupSpec, buildRefinementMockupSpec } from "@/lib/ops/creative-lab/pass-mockup";
import type { PassMockLayoutId } from "@/lib/ops/creative-lab/pass-mockup";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";

import { PassMockup } from "./PassMockup";
import { WorkflowRoundIndicator } from "./WorkflowRoundIndicator";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  preset?: CreativeLabPresetFile | null;
  busy?: boolean;
  onSelectWinner: (promptId: string) => void;
  onGenerateRefinement: () => void;
  onSelectVariation: (index: number) => void;
};

export function ConceptDeck(props: Props) {
  const { prompts, project, preset, busy, onSelectWinner, onGenerateRefinement, onSelectVariation } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const round1Concepts = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const [openPromptId, setOpenPromptId] = useState<string | null>(null);
  const selectedId = project.selectedConceptPromptId ?? null;
  const winningPrompt = round1Concepts.find((p) => p.id === selectedId) ?? null;
  const winnerStrategy = winningPrompt?.strategyId ? strategyById(winningPrompt.strategyId) : null;
  const workflowRound = project.workflowRound ?? 1;
  const refinementGenerated = project.refinementGenerated === true;
  const refinements = project.refinementVariations ?? [];
  const selectedVariation = project.selectedVariationIndex ?? null;

  if (!round1Concepts.length) return null;

  const displayRound: 1 | 2 | 3 =
    workflowRound === 3 ? 3 : refinementGenerated ? 2 : 1;

  return (
    <section className="cl-concept-deck" aria-label="Pass workflow">
      <WorkflowRoundIndicator round={displayRound} />

      {!refinementGenerated ? (
        <>
          <header className="cl-concept-deck__head">
            <h2>Round 1 — Pick a Direction</h2>
            <p className="ops-dim">Four strategies — choose the pass family you want to refine.</p>
          </header>
          <div className="cl-concept-deck__grid">
            {round1Concepts.map((p) => {
              const key = p.variationKey ?? "?";
              const spec = buildPassMockupSpec(p, project, preset, 0);
              const isWinner = selectedId === p.id;
              const isOpen = openPromptId === p.id;
              return (
                <article
                  key={p.id}
                  className={`cl-concept-deck__card cl-concept-deck__card--${key.toLowerCase()}${isWinner ? " cl-concept-deck__card--winner" : ""}`}
                >
                  <div className="cl-pass-mock__frame">
                    <PassMockup spec={spec} />
                  </div>
                  <div className="cl-concept-deck__body">
                    <h3>{spec.strategyLabel}</h3>
                    <p className="cl-concept-deck__tagline">{spec.tagline}</p>
                    <div className="cl-concept-deck__actions">
                      <button
                        type="button"
                        className={`cl-concept-deck__use-btn${isWinner ? " cl-concept-deck__use-btn--on" : ""}`}
                        disabled={busy}
                        onClick={() => onSelectWinner(p.id)}
                      >
                        {isWinner ? "✓ SELECTED LOOK" : "USE THIS LOOK"}
                      </button>
                      <button
                        type="button"
                        className="cl-concept-deck__view-btn"
                        onClick={() => setOpenPromptId(isOpen ? null : p.id)}
                      >
                        {isOpen ? "Hide prompt" : "View prompt"}
                      </button>
                    </div>
                    {isOpen ? <pre className="cl-concept-deck__prompt">{p.renderedPrompt}</pre> : null}
                  </div>
                </article>
              );
            })}
          </div>

          {winningPrompt && winnerStrategy ? (
            <section className="cl-refine-cta">
              <h3 className="cl-refine-cta__title">REFINE THIS LOOK</h3>
              <p className="cl-refine-cta__desc">
                <strong>{winnerStrategy.label}</strong> selected — generate 8 layout treatments with the same
                preset, artifact, and event context.
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
            <h2>Round 2 — Refine the Winner</h2>
            <p className="cl-concept-deck__inherit ops-dim">
              Inherits <strong>{winnerStrategy?.label}</strong>
              {preset ? <> · {preset.name}</> : null}
              {project.artifactType ? <> · {project.event}</> : null}
            </p>
          </header>
          <div className="cl-concept-deck__grid cl-concept-deck__grid--refine">
            {refinements.map((variation) => {
              const treatment = {
                layoutId: variation.layoutId as PassMockLayoutId,
                label: variation.treatmentLabel,
              };
              const spec = buildRefinementMockupSpec(
                winningPrompt!,
                project,
                preset,
                treatment,
                variation.index,
              );
              const isWinner = selectedVariation === variation.index;
              return (
                <article
                  key={variation.id}
                  className={`cl-concept-deck__card cl-concept-deck__card--refine${isWinner ? " cl-concept-deck__card--winner" : ""}`}
                >
                  <div className="cl-pass-mock__frame">
                    <PassMockup spec={spec} />
                  </div>
                  <div className="cl-concept-deck__body">
                    <h3>
                      Variant {variation.index}
                      <span className="cl-concept-deck__strategy-name">{variation.treatmentLabel}</span>
                    </h3>
                    <div className="cl-concept-deck__actions">
                      <button
                        type="button"
                        className={`cl-concept-deck__use-btn${isWinner ? " cl-concept-deck__use-btn--on" : ""}`}
                        disabled={busy}
                        onClick={() => onSelectVariation(variation.index)}
                      >
                        {isWinner ? "✓ SELECTED VARIATION" : "USE THIS VARIATION"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
