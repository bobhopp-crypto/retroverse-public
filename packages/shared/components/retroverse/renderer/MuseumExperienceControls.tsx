"use client";

type Props = {
  sceneIndex: number;
  sceneCount: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** Patron-facing museum navigation — no production terminology. */
export function MuseumExperienceControls({
  sceneIndex,
  sceneCount,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: Props) {
  return (
    <footer className="rv-exp-museum-nav" aria-label="Exhibit navigation">
      <div className="rv-exp-museum-nav__dots" role="tablist" aria-label="Exhibits">
        {Array.from({ length: sceneCount }, (_, index) => (
          <span
            key={`exhibit-dot-${index}`}
            className={
              index === sceneIndex
                ? "rv-exp-museum-nav__dot rv-exp-museum-nav__dot--active"
                : "rv-exp-museum-nav__dot"
            }
            role="tab"
            aria-selected={index === sceneIndex}
            aria-label={`Exhibit ${index + 1} of ${sceneCount}`}
          />
        ))}
      </div>
      <div className="rv-exp-museum-nav__zones" aria-hidden>
        <button
          type="button"
          className="rv-exp-museum-nav__zone rv-exp-museum-nav__zone--prev"
          disabled={!canPrev}
          onClick={onPrev}
          tabIndex={-1}
        />
        <button
          type="button"
          className="rv-exp-museum-nav__zone rv-exp-museum-nav__zone--next"
          disabled={!canNext}
          onClick={onNext}
          tabIndex={-1}
        />
      </div>
    </footer>
  );
}
