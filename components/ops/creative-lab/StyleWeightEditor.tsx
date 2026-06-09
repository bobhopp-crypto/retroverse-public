"use client";

import type { StyleCategory, StyleDefinition, StyleSelection, WeightedStyle } from "@/lib/ops/creative-lab/types";

type Props = {
  category: StyleCategory;
  title: string;
  styles: StyleDefinition[];
  selection: StyleSelection;
  onChange: (next: StyleSelection) => void;
};

function getWeight(selection: StyleSelection, category: StyleCategory, id: string): number {
  return selection[category].find((w) => w.id === id)?.weight ?? 0;
}

function setWeight(
  selection: StyleSelection,
  category: StyleCategory,
  id: string,
  weight: number,
): StyleSelection {
  const others = selection[category].filter((w) => w.id !== id);
  const clamped = Math.max(0, Math.min(100, weight));
  const next =
    clamped > 0 ? [...others, { id, weight: clamped }] : others;
  return { ...selection, [category]: next.sort((a, b) => b.weight - a.weight) };
}

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
                    onChange(setWeight(selection, category, style.id, Number(e.target.value)))
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

export function selectionHasWeights(selection: StyleSelection): boolean {
  return (
    selection.credential.length > 0 ||
    selection.illustration.length > 0 ||
    selection.color.length > 0 ||
    selection.density.length > 0
  );
}

export function weightedStylesSummary(selection: StyleSelection): string {
  const parts: string[] = [];
  for (const cat of ["credential", "illustration", "color", "density"] as const) {
    const top = selection[cat][0];
    if (top) parts.push(`${top.weight}% ${top.id}`);
  }
  return parts.join(" · ") || "No styles weighted";
}
