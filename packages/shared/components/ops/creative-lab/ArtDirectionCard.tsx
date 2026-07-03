"use client";

import { artDirectionByKey } from "@/lib/ops/creative-lab/art-directions";
import { buildArtBoardSpec } from "@/lib/ops/creative-lab/art-board-spec";
import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";

import { ArtDirectionBoard } from "./ArtDirectionBoard";

type Props = {
  variationKey: string;
  project: CreativeLabProjectFile;
  selected?: boolean;
  compact?: boolean;
  refinementIndex?: number;
  treatmentLabel?: string;
  onSelect?: () => void;
  selectLabel?: string;
  selectedLabel?: string;
};

export function ArtDirectionCard(props: Props) {
  const {
    variationKey,
    project,
    selected,
    compact,
    refinementIndex,
    treatmentLabel,
    onSelect,
    selectLabel = "USE THIS DIRECTION",
    selectedLabel = "✓ SELECTED",
  } = props;

  const direction = artDirectionByKey(variationKey);
  const spec = buildArtBoardSpec(project, variationKey, undefined, refinementIndex);

  return (
    <article
      className={`cl-art-card cl-art-card--${variationKey.toLowerCase()}${selected ? " cl-art-card--selected" : ""}${compact ? " cl-art-card--compact" : ""}`}
    >
      <div className="cl-art-card__frame">
        <ArtDirectionBoard spec={spec} compact={compact} />
      </div>
      {!compact ? (
        <div className="cl-art-card__body">
          <h3 className="cl-art-card__title">{direction.title}</h3>
          <p className="cl-art-card__subtitle">{direction.subtitle}</p>
          <div className="cl-art-card__chips">
            {direction.styleChips.map((chip) => (
              <span key={chip} className="cl-art-card__chip">
                {chip}
              </span>
            ))}
          </div>
          <p className="cl-art-card__collect">
            Collectibility: <strong>{direction.collectibility}</strong>
          </p>
          <p className="cl-art-card__why">{direction.whyThisWorks}</p>
          {onSelect ? (
            <button
              type="button"
              className={`cl-art-card__select${selected ? " cl-art-card__select--on" : ""}`}
              onClick={onSelect}
            >
              {selected ? selectedLabel : selectLabel}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="cl-art-card__body cl-art-card__body--compact">
          <h3>
            {treatmentLabel ?? `Version ${refinementIndex}`}
          </h3>
          {onSelect ? (
            <button
              type="button"
              className={`cl-art-card__select${selected ? " cl-art-card__select--on" : ""}`}
              onClick={onSelect}
            >
              {selected ? "✓ SELECTED VERSION" : "USE THIS VERSION"}
            </button>
          ) : null}
        </div>
      )}
    </article>
  );
}
