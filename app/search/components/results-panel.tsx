"use client";

import type { ReactNode } from "react";

type ResultsPanelProps = {
  id: string;
  title: string;
  count: number;
  tone: "albums" | "songs" | "artists";
  children: ReactNode;
};

export function ResultsPanel({
  id,
  title,
  count,
  tone,
  children,
}: ResultsPanelProps) {
  return (
    <section
      className={`results-panel results-panel--${tone}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="results-panel__header">
        <h2 id={`${id}-heading`} className="results-panel__title">
          {title}
        </h2>
        <span className="results-panel__count">{count}</span>
      </div>
      <div className="results-panel__scroll" tabIndex={0} role="region" aria-label={`${title} results`}>
        <ul className="results-panel__track">{children}</ul>
      </div>
    </section>
  );
}
