"use client";

import { formatDuration } from "./scene-types";

type Props = {
  sceneIndex: number;
  sceneCount: number;
  momentLabel: string;
  remainingSec: number;
  autoplay: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggleAutoplay: () => void;
};

export function ExperienceControls({
  sceneIndex,
  sceneCount,
  momentLabel,
  remainingSec,
  autoplay,
  canPrev,
  canNext,
  onPrev,
  onNext,
  onToggleAutoplay,
}: Props) {
  const progress = sceneCount > 0 ? ((sceneIndex + 1) / sceneCount) * 100 : 0;

  return (
    <footer className="rv-exp-controls">
      <div className="rv-exp-controls__progress" aria-hidden>
        <div className="rv-exp-controls__progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="rv-exp-controls__row">
        <div className="rv-exp-controls__meta">
          <span className="rv-exp-controls__count">
            {sceneIndex + 1} / {sceneCount}
          </span>
          <span className="rv-exp-controls__moment">{momentLabel}</span>
          <span className="rv-exp-controls__remaining">
            {formatDuration(remainingSec)} left
          </span>
        </div>
        <div className="rv-exp-controls__actions">
          <button
            type="button"
            className="rv-exp-controls__btn"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous scene"
          >
            Previous
          </button>
          <button
            type="button"
            className="rv-exp-controls__btn rv-exp-controls__btn--autoplay"
            onClick={onToggleAutoplay}
            aria-pressed={autoplay}
          >
            {autoplay ? "Autoplay on" : "Autoplay"}
          </button>
          <button
            type="button"
            className="rv-exp-controls__btn rv-exp-controls__btn--primary"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next scene"
          >
            Next
          </button>
        </div>
      </div>
    </footer>
  );
}
