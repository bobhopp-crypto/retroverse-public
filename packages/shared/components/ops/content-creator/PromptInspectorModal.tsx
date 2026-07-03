"use client";

import { useState } from "react";

import type {
  ComposedRvbrPrompt,
  PromptDebugBreakdown,
  PromptMetrics,
  PromptQualityScores,
} from "@/lib/creative/rvbr-prompt-types";

type Props = {
  open: boolean;
  onClose: () => void;
  front: ComposedRvbrPrompt | null;
  back: ComposedRvbrPrompt | null;
};

const LAYER_ORDER: (keyof PromptDebugBreakdown)[] = [
  "artifactArchetype",
  "eraProfile",
  "directionRules",
  "brandRules",
  "governedText",
];

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
}

export function PromptInspectorModal({ open, onClose, front, back }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const composed = side === "front" ? front : back;
  if (!composed) {
    return (
      <div className="cc-prompt-modal" role="dialog" aria-modal="true" aria-label="Prompt Inspector">
        <div className="cc-prompt-modal__backdrop" onClick={onClose} />
        <div className="cc-prompt-modal__panel">
          <p>No prompt composed yet. Use View Prompt first.</p>
          <button type="button" className="cc-creator__btn cc-creator__btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const { debugBreakdown, finalPrompt, qualityScores, promptMetrics } = composed;

  function handleCopy() {
    copyText(finalPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="cc-prompt-modal" role="dialog" aria-modal="true" aria-label="Prompt Inspector">
      <div className="cc-prompt-modal__backdrop" onClick={onClose} />
      <div className="cc-prompt-modal__panel">
        <header className="cc-prompt-modal__head">
          <h2>Prompt Inspector</h2>
          <button type="button" className="cc-prompt-modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="cc-prompt-modal__tabs">
          <button
            type="button"
            className={side === "front" ? "is-on" : ""}
            onClick={() => setSide("front")}
          >
            Front
          </button>
          <button
            type="button"
            className={side === "back" ? "is-on" : ""}
            onClick={() => setSide("back")}
          >
            Back
          </button>
        </div>

        <QualityPanel scores={qualityScores} />
        <PromptSizePanel metrics={promptMetrics} />

        <div className="cc-prompt-modal__layers">
          {LAYER_ORDER.map((key) => {
            const layer = debugBreakdown[key];
            return (
              <details key={key} className="cc-prompt-modal__layer" open={key === "artifactArchetype"}>
                <summary>{layer.label}</summary>
                <pre>{layer.content}</pre>
              </details>
            );
          })}
          <details className="cc-prompt-modal__layer cc-prompt-modal__layer--final" open>
            <summary>Final Prompt Sent To Model</summary>
            <pre>{finalPrompt}</pre>
          </details>
        </div>

        <footer className="cc-prompt-modal__foot">
          <button type="button" className="cc-creator__btn cc-creator__btn--secondary" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy Final Prompt"}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function PromptSizePanel({ metrics }: { metrics: PromptMetrics }) {
  const overTarget = metrics.charCount > metrics.targetCharCount;
  return (
    <div className="cc-prompt-size" aria-label="Prompt size">
      <span className="cc-prompt-size__title">Prompt Size</span>
      <div className="cc-prompt-size__grid">
        <div className={`cc-prompt-size__item${overTarget ? " cc-prompt-size__item--warn" : ""}`}>
          <span className="cc-prompt-size__label">Current</span>
          <span className="cc-prompt-size__value">
            {metrics.charCount.toLocaleString()} chars · ~{metrics.tokenEstimate.toLocaleString()} tokens
          </span>
        </div>
        <div className="cc-prompt-size__item cc-prompt-size__item--target">
          <span className="cc-prompt-size__label">Target</span>
          <span className="cc-prompt-size__value">
            ≤{metrics.targetCharCount.toLocaleString()} chars · ~{metrics.targetTokenEstimate.toLocaleString()} tokens
          </span>
        </div>
      </div>
      {overTarget ? (
        <p className="cc-prompt-size__hint">Prompt exceeds one-screen target — scroll in final prompt means too large.</p>
      ) : null}
    </div>
  );
}

export function QualityPanel({ scores }: { scores: PromptQualityScores }) {
  const items: { label: string; key: keyof PromptQualityScores }[] = [
    { label: "Era specificity", key: "eraSpecificity" },
    { label: "Brand specificity", key: "brandSpecificity" },
    { label: "Variation score", key: "variationScore" },
    { label: "Cliché risk", key: "clicheRisk" },
  ];

  return (
    <div className="cc-prompt-quality" aria-label="Prompt Quality Score">
      <span className="cc-prompt-quality__title">Prompt Quality</span>
      <div className="cc-prompt-quality__grid">
        {items.map((item) => (
          <div key={item.key} className={`cc-prompt-quality__item cc-prompt-quality__item--${scores[item.key]}`}>
            <span className="cc-prompt-quality__label">{item.label}</span>
            <span className="cc-prompt-quality__value">{scores[item.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
