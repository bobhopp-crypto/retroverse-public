"use client";

import { useMemo, useState } from "react";

import { strategyById } from "@/lib/ops/creative-lab/concept-strategies";
import type { GeneratedPrompt } from "@/lib/ops/creative-lab/types";

type Props = {
  prompts: GeneratedPrompt[];
};

export function ConceptDeck(props: Props) {
  const { prompts } = props;
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
        <p className="ops-dim">Four directions — same event, different creative emphasis.</p>
      </header>
      <div className="cl-concept-deck__grid">
        {variations.map((p) => {
          const key = p.variationKey ?? "?";
          const strategy = p.strategyId ? strategyById(p.strategyId) : null;
          const hue = (key.charCodeAt(0) ?? 65) * 9;
          const isOpen = openPromptId === p.id;
          return (
            <article key={p.id} className={`cl-concept-deck__card cl-concept-deck__card--${key.toLowerCase()}`}>
              <div
                className="cl-concept-deck__thumb"
                style={{
                  background: `linear-gradient(145deg, hsl(${hue} 55% 58%), hsl(${(hue + 40) % 360} 48% 38%))`,
                }}
                aria-hidden
              >
                <span className="cl-concept-deck__key">CONCEPT {key}</span>
              </div>
              <div className="cl-concept-deck__body">
                <h3>{strategy?.label ?? `Concept ${key}`}</h3>
                <p className="cl-concept-deck__desc">{strategy?.description ?? p.conceptSummary}</p>
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
