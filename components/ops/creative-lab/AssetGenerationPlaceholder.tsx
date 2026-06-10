"use client";

type Props = {
  hasConcepts: boolean;
  hasWinner?: boolean;
  hasVariation?: boolean;
  workflowRound?: 1 | 2 | 3;
};

export function AssetGenerationPlaceholder(props: Props) {
  const { hasConcepts, hasWinner, hasVariation, workflowRound = 1 } = props;
  if (!hasConcepts) return null;
  if (workflowRound < 3) return null;

  return (
    <section className="cl-asset-gen" aria-label="Asset generation pipeline">
      <header className="cl-asset-gen__head">
        <h2>Round 3 — Asset Generation</h2>
        <p className="ops-dim">Look locked — ready for image provider.</p>
      </header>
      <div className="cl-asset-gen__pipeline">
        <span className="cl-asset-gen__step cl-asset-gen__step--done">Concepts</span>
        <span className="cl-asset-gen__arrow">↓</span>
        <span className="cl-asset-gen__step">Assets</span>
        <span className="cl-asset-gen__arrow">↓</span>
        <span className="cl-asset-gen__step">Approve</span>
        <span className="cl-asset-gen__arrow">↓</span>
        <span className="cl-asset-gen__step">Final</span>
      </div>
      <button type="button" className={`cl-asset-gen__btn${hasWinner ? " cl-asset-gen__btn--ready" : ""}`} disabled>
        GENERATE ASSETS
      </button>
      <p className="cl-asset-gen__status">
        <strong>Status:</strong>{" "}
        {hasVariation
          ? "Variation selected — ready when image provider connects"
          : hasWinner
            ? "Concept selected — pick a variation first"
            : "Image Provider Not Connected"}
      </p>
    </section>
  );
}
