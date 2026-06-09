"use client";

import { useMemo, useState } from "react";

import type { GeneratedPrompt } from "@/lib/ops/creative-lab/types";

type Props = {
  prompts: GeneratedPrompt[];
};

export function ConceptVariationsPanel(props: Props) {
  const { prompts } = props;
  const latestSetId = prompts.find((p) => p.variationSetId)?.variationSetId;
  const variations = useMemo(() => {
    if (!latestSetId) return prompts.slice(0, 4);
    return prompts.filter((p) => p.variationSetId === latestSetId);
  }, [prompts, latestSetId]);

  const [activeKey, setActiveKey] = useState<string>(
    variations[0]?.variationKey ?? variations[0]?.id ?? "A",
  );

  const active =
    variations.find((p) => p.variationKey === activeKey) ??
    variations.find((p) => p.id === activeKey) ??
    variations[0];

  if (!variations.length) {
    return <p className="ops-dim">No concept variations yet. Generate prompts from Pass Lab.</p>;
  }

  return (
    <section className="cl-concepts">
      <div className="cl-concepts__tabs" role="tablist" aria-label="Concept variations">
        {variations.map((p) => {
          const key = p.variationKey ?? p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={activeKey === key}
              className={`cl-concepts__tab${activeKey === key ? " cl-concepts__tab--on" : ""}`}
              onClick={() => setActiveKey(key)}
            >
              Concept {p.variationKey ?? "?"}
            </button>
          );
        })}
      </div>
      {active ? (
        <div className="cl-concepts__panel" role="tabpanel">
          <p className="cl-concepts__summary">{active.conceptSummary}</p>
          <pre className="cl-prompt-preview__text cl-concepts__prompt">{active.renderedPrompt}</pre>
        </div>
      ) : null}
    </section>
  );
}
