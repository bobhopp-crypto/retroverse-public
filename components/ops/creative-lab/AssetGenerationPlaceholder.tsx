"use client";

type Props = {
  hasConcepts: boolean;
  hasWinner?: boolean;
};

export function AssetGenerationPlaceholder(props: Props) {
  const { hasConcepts, hasWinner } = props;
  if (!hasConcepts) return null;

  return (
    <section className="cl-asset-gen" aria-label="Asset generation pipeline">
      <header className="cl-asset-gen__head">
        <h2>Next: Assets</h2>
        <p className="ops-dim">Concepts → Assets → Approve → Final</p>
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
        {hasWinner ? "Look selected — ready when image provider connects" : "Image Provider Not Connected"}
      </p>
    </section>
  );
}
