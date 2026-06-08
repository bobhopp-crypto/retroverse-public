"use client";

import {
  REVIEW_CLASSIFICATIONS,
  type ReviewClassification,
} from "@/lib/ops/year-workspace/review-types";

export function ClassButtonGroup(props: {
  value: ReviewClassification;
  disabled?: boolean;
  onChange: (value: ReviewClassification) => void;
}) {
  return (
    <div className="ops-ru-class-btns" role="group" aria-label="Classification">
      {REVIEW_CLASSIFICATIONS.map((c) => (
        <button
          key={c}
          type="button"
          className={`ops-ru-class-btns__btn${props.value === c ? " ops-ru-class-btns__btn--on" : ""}`}
          disabled={props.disabled}
          aria-pressed={props.value === c}
          onClick={(e) => {
            e.stopPropagation();
            props.onChange(c);
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
