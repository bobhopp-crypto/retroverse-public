"use client";

import type { StyleCategory, StyleDefinition, StyleSelection } from "@/lib/ops/creative-lab/types";
import { getWeight, setManualWeight } from "@/lib/ops/creative-lab/style-selection";

export { selectionHasWeights, weightedStylesSummary } from "@/lib/ops/creative-lab/style-selection";

type Props = {
  category: StyleCategory;
  title: string;
  styles: StyleDefinition[];
  selection: StyleSelection;
  onChange: (next: StyleSelection) => void;
};

/** Advanced-only slider editor (used for density in manual mode). */
export function StyleWeightEditor(props: Props) {
  const { category, title, styles, selection, onChange } = props;

  return (
    <section className="cl-style-group">
      <h3 className="cl-style-group__title">{title}</h3>
      <ul className="cl-style-group__list">
        {styles.map((style) => {
          const weight = getWeight(selection, category, style.id);
          return (
            <li key={style.id} className="cl-style-row">
              <div className="cl-style-row__meta">
                <span className="cl-style-row__label">{style.label}</span>
                <span className="cl-style-row__desc">{style.description}</span>
              </div>
              <div className="cl-style-row__weight">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weight}
                  aria-label={`${style.label} weight`}
                  onChange={(e) =>
                    onChange(setManualWeight(selection, category, style.id, Number(e.target.value)))
                  }
                />
                <span className="cl-style-row__pct">{weight}%</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
