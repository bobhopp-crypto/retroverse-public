"use client";

import {
  reviewUniverse1967TagDefs,
  type RvTagId,
} from "@/lib/ops/rvtags-review/vocabulary";

export function RetroverseTagsBlock(props: {
  tags: RvTagId[];
  disabled?: boolean;
  onToggle: (tagId: RvTagId) => void;
}) {
  const selected = new Set(props.tags);

  return (
    <div className="ops-ru-card__tags" role="group" aria-label="Retroverse Tags">
      {reviewUniverse1967TagDefs().map((def) => {
        const on = selected.has(def.id);
        return (
          <button
            key={def.id}
            type="button"
            className={`ops-ru-card__tag${on ? " ops-ru-card__tag--on" : ""}`}
            disabled={props.disabled}
            aria-pressed={on}
            onClick={(e) => {
              e.stopPropagation();
              props.onToggle(def.id);
            }}
          >
            {def.label}
          </button>
        );
      })}
    </div>
  );
}
