"use client";

import { INFLUENCE_LIBRARY } from "@/lib/ops/creative-lab/influences";

export function InfluenceLibraryPanel() {
  return (
    <details className="cl-influence-lib">
      <summary>Retroverse Influence Library ({INFLUENCE_LIBRARY.length} influences)</summary>
      <p className="ops-dim">
        Hidden reference layer — concepts inherit influence tags from preset + strategy. No image generation required.
      </p>
      <ul className="cl-influence-lib__list">
        {INFLUENCE_LIBRARY.map((inf) => (
          <li key={inf.id} className="cl-influence-lib__item">
            <strong>{inf.label}</strong>
            <span className="cl-influence-lib__era">{inf.era}</span>
            <span className="cl-influence-lib__cat">{inf.category}</span>
            <p>{inf.description}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}
