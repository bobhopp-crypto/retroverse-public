"use client";

import type { BehindStorySection } from "@/lib/retroverse/experience/behind-the-story";

import "./song-experience.css";

type Props = {
  sections: BehindStorySection[];
  heading?: string;
  className?: string;
};

export function BehindTheStory({ sections, heading = "Behind the Story", className }: Props) {
  if (sections.length === 0) return null;

  const panelClass = ["rv-exp-chapter", "rv-exp-behind", className].filter(Boolean).join(" ");
  const headingId = `rv-exp-behind-${heading.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <section className={panelClass} aria-labelledby={headingId}>
      <details className="rv-exp-behind__details">
        <summary className="rv-exp-behind__summary">
          <h2 id={headingId}>{heading}</h2>
          <span className="rv-exp-behind__hint">Expand to view references</span>
        </summary>
        <div className="rv-exp-behind__body">
          {sections.map((section) => (
            <div key={section.id} className="rv-exp-behind__group">
              <h3>{section.title}</h3>
              <ul>
                {section.entries.map((entry) => (
                  <li key={entry.id}>
                    <details className="rv-exp-behind__entry">
                      <summary>{entry.preview}</summary>
                      <div className="rv-exp-behind__entry-meta">
                        <span>{entry.sourceName}</span>
                        {entry.url ? (
                          <a href={entry.url} target="_blank" rel="noopener noreferrer">
                            View source
                          </a>
                        ) : null}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
