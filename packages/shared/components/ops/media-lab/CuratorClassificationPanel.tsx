"use client";

import { parseTypedTitle } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

import { CURATOR_CATEGORIES, type CuratorCategory } from "./curator-categories";

type CuratorClassificationPanelProps = {
  title: string;
  category?: string;
  onCategorize: (category: CuratorCategory) => void;
};

export function CuratorClassificationPanel(props: CuratorClassificationPanelProps) {
  const parsed = parseTypedTitle(props.title);
  const activeLabel =
    props.category ||
    (parsed.type
      ? CURATOR_CATEGORIES.find((c) => c.contentType === parsed.type)?.label
      : null);

  return (
    <div className="ops-ml-curator-classify">
      <p className="ops-ml-curator-classify__hint">
        Pick a category to keep this clip and move to the next.
      </p>
      <div className="ops-ml-curator-classify__grid" role="group" aria-label="Clip category">
        {CURATOR_CATEGORIES.map((category) => (
          <button
            key={category.label}
            type="button"
            className={`ops-ml-curator-btn${
              activeLabel === category.label ? " ops-ml-curator-btn--on" : ""
            }`}
            title={category.help}
            onClick={() => props.onCategorize(category)}
          >
            {category.label}
            <span className="ops-ml-deck__key">{category.key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
