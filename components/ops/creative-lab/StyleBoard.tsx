"use client";

import type { StyleCategory, StyleDefinition, StyleSelection } from "@/lib/ops/creative-lab/types";
import {
  getWeight,
  isStyleSelected,
  setManualWeight,
  toggleStyleSelection,
} from "@/lib/ops/creative-lab/style-selection";

export type StyleBoardMode = "simple" | "advanced";

type Props = {
  category: StyleCategory;
  title: string;
  styles: StyleDefinition[];
  selection: StyleSelection;
  mode: StyleBoardMode;
  onChange: (next: StyleSelection) => void;
};

function thumbHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

export function StyleBoard(props: Props) {
  const { category, title, styles, selection, mode, onChange } = props;

  return (
    <section className="cl-style-board" data-category={category}>
      <h3 className="cl-style-board__title">{title}</h3>
      <div className="cl-style-board__grid" role="list">
        {styles.map((style) => {
          const selected = isStyleSelected(selection, category, style.id);
          const weight = getWeight(selection, category, style.id);
          const hue = thumbHue(style.id);

          return (
            <article
              key={style.id}
              role="listitem"
              className={`cl-style-card${selected ? " cl-style-card--on" : ""}`}
            >
              <button
                type="button"
                className="cl-style-card__hit"
                aria-pressed={selected}
                onClick={() => onChange(toggleStyleSelection(selection, category, style.id))}
              >
                <div
                  className="cl-style-card__thumb"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 62% 72%), hsl(${(hue + 48) % 360} 48% 48%))`,
                  }}
                  aria-hidden
                >
                  <span className="cl-style-card__thumb-label">{style.label.slice(0, 2)}</span>
                </div>
                <div className="cl-style-card__body">
                  <span className="cl-style-card__name">{style.label}</span>
                  <span className="cl-style-card__desc">{style.description}</span>
                </div>
                {selected ? (
                  <span className="cl-style-card__weight" aria-label={`Weight ${weight}%`}>
                    {weight}%
                  </span>
                ) : (
                  <span className="cl-style-card__weight cl-style-card__weight--off">—</span>
                )}
              </button>
              {mode === "advanced" && selected ? (
                <div className="cl-style-card__slider">
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
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
