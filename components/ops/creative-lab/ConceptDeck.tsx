"use client";

import { useMemo, useState } from "react";

import { buildConceptMockBoard } from "@/lib/ops/creative-lab/concept-mock";
import { strategyById } from "@/lib/ops/creative-lab/concept-strategies";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";

import { ConceptMockPanel } from "./ConceptMockPanel";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  preset?: CreativeLabPresetFile | null;
};

export function ConceptDeck(props: Props) {
  const { prompts, project, preset } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const variations = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const [openPromptId, setOpenPromptId] = useState<string | null>(null);

  if (!variations.length) return null;

  return (
    <section className="cl-concept-deck" aria-label="Concept deck">
      <header className="cl-concept-deck__head">
        <h2>Concept Deck</h2>
        <p className="ops-dim">Four visual directions — same event, different creative emphasis.</p>
      </header>
      <div className="cl-concept-deck__grid">
        {variations.map((p) => {
          const key = p.variationKey ?? "?";
          const strategy = p.strategyId ? strategyById(p.strategyId) : null;
          const board = buildConceptMockBoard(p, project, preset);
          const isOpen = openPromptId === p.id;
          return (
            <article key={p.id} className={`cl-concept-deck__card cl-concept-deck__card--${key.toLowerCase()}`}>
              <ConceptMockPanel board={board} variationKey={key} />
              <div className="cl-concept-deck__body">
                <h3>
                  Concept {key}
                  <span className="cl-concept-deck__strategy-name">{strategy?.label ?? board.strategyLabel}</span>
                </h3>
                <button
                  type="button"
                  className="cl-concept-deck__view-btn"
                  onClick={() => setOpenPromptId(isOpen ? null : p.id)}
                >
                  {isOpen ? "Hide prompt" : "View prompt"}
                </button>
                {isOpen ? (
                  <pre className="cl-concept-deck__prompt">{p.renderedPrompt}</pre>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
