"use client";

import { useTrainingMode } from "./TrainingModeProvider";

export function TrainingModeToggle() {
  const { trainingMode, toggleTrainingMode } = useTrainingMode();

  return (
    <button
      type="button"
      className={trainingMode ? "rs-guide-toggle rs-guide-toggle--on rs-training-toggle" : "rs-guide-toggle rs-training-toggle"}
      onClick={toggleTrainingMode}
      aria-pressed={trainingMode}
    >
      <span className="rs-guide-toggle__icon" aria-hidden>
        {trainingMode ? "T" : "·"}
      </span>
      Training Mode
    </button>
  );
}
