"use client";

import { useState } from "react";

import {
  CROWD_FIXED_SLOTS,
  CROWD_MORE_TAG_IDS,
  moreTagsActive,
  rvTagLabel,
  STYLE_FIXED_SLOTS,
  STYLE_MORE_TAG_IDS,
  type FixedTagSlot,
} from "@/lib/ops/rvtags-review/fixed-layout";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import { REVIEW_CLASSIFICATIONS } from "@/lib/ops/year-workspace/review-types";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";

type Props = {
  tags: RvTagId[];
  classification: ReviewClassification;
  suggestedTags?: RvTagId[];
  onTagsChange: (tags: RvTagId[]) => void;
  onClassificationChange: (value: ReviewClassification) => void;
};

export function AtlasRvTagsPanels({
  tags,
  classification,
  suggestedTags = [],
  onTagsChange,
  onClassificationChange,
}: Props) {
  const [morePanel, setMorePanel] = useState<"style" | "crowd" | null>(null);

  const toggleTag = (id: RvTagId) => {
    onTagsChange(tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id]);
  };

  return (
    <div className="atlas-tags">
      <FixedTagPanel
        name="Style"
        variant="style"
        slots={STYLE_FIXED_SLOTS}
        moreTagIds={STYLE_MORE_TAG_IDS}
        draft={tags}
        moreOpen={morePanel === "style"}
        onToggle={toggleTag}
        onMoreOpen={() => setMorePanel((p) => (p === "style" ? null : "style"))}
        onMoreClose={() => setMorePanel(null)}
        suggestedTags={suggestedTags}
      />
      <FixedTagPanel
        name="Crowd"
        variant="crowd"
        slots={CROWD_FIXED_SLOTS}
        moreTagIds={CROWD_MORE_TAG_IDS}
        draft={tags}
        moreOpen={morePanel === "crowd"}
        onToggle={toggleTag}
        onMoreOpen={() => setMorePanel((p) => (p === "crowd" ? null : "crowd"))}
        onMoreClose={() => setMorePanel(null)}
        suggestedTags={suggestedTags}
      />
      <div className="atlas-tags__class">
        <p className="atlas-tags__class-label">Performance class</p>
        <div className="atlas-tags__class-btns">
          {REVIEW_CLASSIFICATIONS.map((value) => (
            <button
              key={value}
              type="button"
              className={`atlas-tags__class-btn${
                classification === value ? " atlas-tags__class-btn--on" : ""
              }`}
              onClick={() => onClassificationChange(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FixedTagPanel(props: {
  name: string;
  variant: "style" | "crowd";
  slots: FixedTagSlot[];
  moreTagIds: RvTagId[];
  draft: RvTagId[];
  moreOpen: boolean;
  onToggle: (id: RvTagId) => void;
  onMoreOpen: () => void;
  onMoreClose: () => void;
  suggestedTags: RvTagId[];
}) {
  const moreActive = moreTagsActive(props.draft, props.moreTagIds);

  return (
    <section className={`atlas-tags__panel atlas-tags__panel--${props.variant}`}>
      <h3 className="atlas-tags__panel-name">{props.name}</h3>
      <div className="atlas-tags__btns">
        {props.slots.map((slot) => {
          if (slot.kind === "more") {
            return (
              <button
                key={`more-${props.variant}`}
                type="button"
                className={`atlas-tags__btn atlas-tags__btn--more${
                  moreActive ? " atlas-tags__btn--on" : ""
                }`}
                onClick={props.onMoreOpen}
              >
                More…
              </button>
            );
          }
          const on = props.draft.includes(slot.id);
          const suggested = props.suggestedTags.includes(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              className={`atlas-tags__btn${on ? " atlas-tags__btn--on" : ""}${
                suggested ? " atlas-tags__btn--suggested" : ""
              }`}
              onClick={() => props.onToggle(slot.id)}
            >
              {rvTagLabel(slot.id)}
            </button>
          );
        })}
      </div>
      {props.moreOpen ? (
        <div className="atlas-tags__more">
          {props.moreTagIds.map((id) => {
            const on = props.draft.includes(id);
            return (
              <button
                key={id}
                type="button"
                className={`atlas-tags__btn atlas-tags__btn--more-item${
                  on ? " atlas-tags__btn--on" : ""
                }`}
                onClick={() => props.onToggle(id)}
              >
                {rvTagLabel(id)}
              </button>
            );
          })}
          <button type="button" className="atlas-tags__more-close" onClick={props.onMoreClose}>
            Done
          </button>
        </div>
      ) : null}
    </section>
  );
}
