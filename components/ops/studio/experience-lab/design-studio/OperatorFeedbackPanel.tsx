"use client";

import { useEffect, useState } from "react";

import {
  loadOperatorFeedback,
  toggleOperatorFeedback,
} from "@/lib/retroverse/experience-design/feedback-storage";
import {
  OPERATOR_FEEDBACK_TAGS,
  type OperatorFeedbackStore,
} from "@/lib/retroverse/experience-design/types";

type Props = {
  rvtr: string;
  sceneLabel: string;
  publicationName: string;
};

export function OperatorFeedbackPanel({ rvtr, sceneLabel, publicationName }: Props) {
  const [open, setOpen] = useState(true);
  const [feedback, setFeedback] = useState<OperatorFeedbackStore>({});

  useEffect(() => {
    setFeedback(loadOperatorFeedback(rvtr));
  }, [rvtr]);

  return (
    <section className="ds-feedback">
      <button type="button" className="ds-feedback__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide feedback" : "Operator feedback"}
      </button>
      {open ? (
        <div className="ds-feedback__panel">
          <p className="ds-feedback__hint">
            {publicationName} · {sceneLabel} — stored locally only
          </p>
          <div className="ds-feedback__tags">
            {OPERATOR_FEEDBACK_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className={
                  feedback[tag.id] ? "ds-feedback__btn ds-feedback__btn--on" : "ds-feedback__btn"
                }
                onClick={() => setFeedback(toggleOperatorFeedback(rvtr, feedback, tag.id))}
              >
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
