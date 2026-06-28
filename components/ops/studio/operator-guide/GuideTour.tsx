"use client";

import { useCallback, useEffect, useState } from "react";

import { getTourSteps } from "@/lib/ops/studio/operator-guide";

import { useOperatorGuideOptional } from "./OperatorGuideProvider";

type Props = {
  pageId: string;
};

export function GuideTour({ pageId }: Props) {
  const guide = useOperatorGuideOptional();
  const steps = getTourSteps(pageId);
  const [stepIndex, setStepIndex] = useState(0);
  const active = guide?.tourPage === pageId && steps.length > 0;

  const close = useCallback(() => {
    guide?.endTour();
    setStepIndex(0);
  }, [guide]);

  useEffect(() => {
    if (guide?.tourPage === pageId) {
      setStepIndex(0);
    }
  }, [guide?.tourPage, pageId]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close]);

  if (!active || !guide) return null;

  const step = steps[stepIndex];
  if (!step) {
    close();
    return null;
  }

  return (
    <div className="rs-guide-tour" role="dialog" aria-modal="true" aria-labelledby="guide-tour-title">
      <div className="rs-guide-tour__backdrop" onClick={close} aria-hidden />
      <div className="rs-guide-tour__card">
        <p className="rs-guide-tour__step">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h2 id="guide-tour-title" className="rs-guide-tour__title">
          {step.title}
        </h2>
        <p className="rs-guide-tour__body">{step.body}</p>
        <p className="rs-guide-tour__target">
          Look for: <code>{step.target}</code>
        </p>
        <div className="rs-guide-tour__actions">
          <button type="button" className="rs-guide-tour__btn" onClick={close}>
            Exit tour
          </button>
          {stepIndex > 0 ? (
            <button
              type="button"
              className="rs-guide-tour__btn"
              onClick={() => setStepIndex((i) => i - 1)}
            >
              Back
            </button>
          ) : null}
          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              className="rs-guide-tour__btn rs-guide-tour__btn--primary"
              onClick={() => setStepIndex((i) => i + 1)}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className="rs-guide-tour__btn rs-guide-tour__btn--primary"
              onClick={close}
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function GuideTourTrigger({ pageId }: { pageId: string }) {
  const guide = useOperatorGuideOptional();
  const steps = getTourSteps(pageId);
  if (!guide || steps.length === 0) return null;

  return (
    <button
      type="button"
      className="rs-guide-tour-trigger"
      onClick={() => guide.startTour(pageId)}
    >
      Guided tour
    </button>
  );
}
