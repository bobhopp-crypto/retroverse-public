"use client";

import type { VisualWorld, VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";

import { VisualWorldHero } from "./VisualWorldHero";

type Props = {
  world: VisualWorld;
  selected: boolean;
  onSelect: () => void;
};

export function VisualWorldCard({ world, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`cl-world-card cl-world-card--${world.id as VisualWorldId}${selected ? " cl-world-card--on" : ""}`}
      onClick={onSelect}
    >
      {selected ? <span className="cl-world-card__badge">✓ SELECTED</span> : null}
      <div className="cl-world-card__hero" style={{ background: world.heroGradient }}>
        <VisualWorldHero world={world} />
      </div>
      <div className="cl-world-card__body">
        <h3>{world.title}</h3>
        <p className="cl-world-card__desc">{world.description}</p>
        <dl className="cl-world-card__meta">
          <div>
            <dt>Typography</dt>
            <dd>{world.typographyStyle}</dd>
          </div>
          <div>
            <dt>Border</dt>
            <dd>{world.borderStyle}</dd>
          </div>
          <div>
            <dt>Color</dt>
            <dd>{world.colorTreatment}</dd>
          </div>
        </dl>
        <div className="cl-world-card__refs">
          {world.visualReferences.slice(0, 3).map((ref) => (
            <span key={ref} className="cl-world-card__ref">
              {ref}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
