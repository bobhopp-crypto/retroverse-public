"use client";

import { useMemo, useState } from "react";

import { buildPassMockupSpec } from "@/lib/ops/creative-lab/pass-mockup";
import type { CreativeLabPresetFile, CreativeLabProjectFile, GeneratedPrompt } from "@/lib/ops/creative-lab/types";

import { PassMockup } from "./PassMockup";

type Props = {
  prompts: GeneratedPrompt[];
  project: CreativeLabProjectFile;
  preset?: CreativeLabPresetFile | null;
  busy?: boolean;
  onSelectWinner: (promptId: string) => void;
  onMakeMore: () => void;
};

export function ConceptDeck(props: Props) {
  const { prompts, project, preset, busy, onSelectWinner, onMakeMore } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const variations = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const [openPromptId, setOpenPromptId] = useState<string | null>(null);
  const variationRound = project.mockVariationRound ?? 0;
  const selectedId = project.selectedConceptPromptId ?? null;

  if (!variations.length) return null;

  return (
    <section className="cl-concept-deck" aria-label="Pass mockups">
      <header className="cl-concept-deck__head">
        <h2>Pass Options</h2>
        <p className="ops-dim">Four printable directions — pick the one you&apos;d run tonight.</p>
        <button type="button" className="cl-concept-deck__more-btn" disabled={busy} onClick={onMakeMore}>
          MAKE 4 MORE
        </button>
      </header>
      <div className="cl-concept-deck__grid">
        {variations.map((p) => {
          const key = p.variationKey ?? "?";
          const spec = buildPassMockupSpec(p, project, preset, variationRound);
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
