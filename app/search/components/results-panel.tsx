"use client";

import { useRef, type ReactNode } from "react";

type ResultsPanelProps = {
  id: string;
  title: string;
  subtitle: string;
  viewAllHref: string;
  viewAllLabel: string;
  tone: "albums" | "songs" | "artists";
  children: ReactNode;
};

export function ResultsPanel({
  id,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
  tone,
  children,
}: ResultsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.85, 220);
    el.scrollBy({ left: direction * amount, behavior: "smooth" });
  };

  return (
    <section
      className={`results-panel results-panel--${tone}`}
      aria-labelledby={`${id}-heading`}
    >
      <div className="results-panel__header">
        <div className="results-panel__header-main">
          <span className="results-panel__icon" aria-hidden="true">
            {tone === "albums" ? "◉" : tone === "songs" ? "♪" : "★"}
          </span>
          <div>
            <h2 id={`${id}-heading`} className="results-panel__title">
              {title}
            </h2>
            <p className="results-panel__subtitle">{subtitle}</p>
          </div>
        </div>
        <a className="results-panel__view-all" href={viewAllHref}>
          {viewAllLabel}
        </a>
      </div>

      <div className="results-panel__carousel">
        <button
          type="button"
          className="results-panel__arrow results-panel__arrow--prev"
          onClick={() => scrollBy(-1)}
          aria-label={`Scroll ${title} left`}
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="results-panel__scroll"
          tabIndex={0}
          role="region"
          aria-label={`${title} results`}
        >
          <ul className="results-panel__track">{children}</ul>
        </div>

        <button
          type="button"
          className="results-panel__arrow results-panel__arrow--next"
          onClick={() => scrollBy(1)}
          aria-label={`Scroll ${title} right`}
        >
          ›
        </button>
      </div>
    </section>
  );
}
