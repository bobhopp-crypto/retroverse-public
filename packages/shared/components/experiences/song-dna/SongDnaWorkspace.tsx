"use client";

import { useMemo, useState } from "react";

import type { SongDnaChapterId, SongDnaExperience } from "@/lib/experiences/song-dna/types";

import { DnaChapterPreview } from "./DnaChapterPreview";

import "./song-dna-flagship.css";

type SectionId =
  | "summary"
  | "overview"
  | "chapters"
  | "visuals"
  | "art"
  | "sequence"
  | "preview"
  | "review"
  | "production";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "summary", label: "Executive Summary" },
  { id: "overview", label: "DNA Overview" },
  { id: "chapters", label: "Experience Chapters" },
  { id: "visuals", label: "Visual Concepts" },
  { id: "art", label: "Art Direction" },
  { id: "sequence", label: "Audience Sequence" },
  { id: "preview", label: "Preview Wall" },
  { id: "review", label: "Creative Review" },
  { id: "production", label: "Production Readiness" },
];

type Props = {
  experience: SongDnaExperience;
};

export function SongDnaWorkspace({ experience }: Props) {
  const [section, setSection] = useState<SectionId>("summary");
  const [activeChapterId, setActiveChapterId] = useState<SongDnaChapterId>(
    experience.chapters[0]?.id ?? "identity",
  );

  const activeChapter = useMemo(
    () => experience.chapters.find((c) => c.id === activeChapterId) ?? experience.chapters[0],
    [activeChapterId, experience.chapters],
  );

  return (
    <div className="sdna-workspace">
      <header className="sdna-workspace__hero">
        <p className="sdna-workspace__badge">Experience 2.0 · Song DNA · Sprint 3.38</p>
        <h1>Song DNA</h1>
        <p className="sdna-workspace__song">
          {experience.title} — {experience.artist}
        </p>
        <p className="sdna-workspace__tagline">{experience.visualLanguage.signature}</p>
      </header>

      <nav className="sdna-workspace__nav" aria-label="Song DNA workspace sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={section === s.id ? "is-active" : undefined}
            onClick={() => setSection(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <div className="sdna-workspace__body">
        {section === "summary" ? (
          <section className="sdna-panel">
            <h2>Executive Summary</h2>
            <p className="sdna-panel__headline">{experience.executiveSummary.headline}</p>
            <p className="sdna-panel__personality">{experience.executiveSummary.personality}</p>
            <p>{experience.executiveSummary.oneLine}</p>
            <ul className="sdna-panel__strengths">
              {experience.executiveSummary.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {section === "overview" ? (
          <section className="sdna-panel">
            <h2>DNA Overview</h2>
            <p className="sdna-panel__mega">{experience.overview.fingerprintLabel}</p>
            <ul className="sdna-panel__traits">
              {experience.overview.personalityTraits.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <dl className="sdna-signals">
              {experience.signals.slice(0, 12).map((sig) => (
                <div key={sig.id} className={sig.available ? "is-ready" : "is-pending"}>
                  <dt>{sig.label}</dt>
                  <dd>{sig.displayValue}</dd>
                </div>
              ))}
            </dl>
            <h3>Future enrichment slots</h3>
            <ul className="sdna-enrichment">
              {Object.entries(experience.enrichmentSlots).map(([key, ready]) => (
                <li key={key} className={ready ? "is-ready" : "is-pending"}>
                  {key.replace(/([A-Z])/g, " $1").trim()}
                  <span>{ready ? "Ready" : "Awaiting data"}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {section === "chapters" ? (
          <div className="sdna-workspace__chapters-layout">
            <nav className="sdna-chapter-nav">
              {experience.chapters.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  className={activeChapter?.id === c.id ? "is-active" : undefined}
                  onClick={() => setActiveChapterId(c.id)}
                >
                  <span>{i + 1}</span> {c.title}
                </button>
              ))}
            </nav>
            <main className="sdna-chapter-stage">
              {activeChapter ? (
                <>
                  <h2>{activeChapter.title}</h2>
                  <p>{activeChapter.subtitle}</p>
                  <DnaChapterPreview chapter={activeChapter} experience={experience} />
                </>
              ) : null}
            </main>
          </div>
        ) : null}

        {section === "visuals" ? (
          <section className="sdna-panel">
            <h2>Visual Concepts</h2>
            <ul className="sdna-concepts">
              {experience.visualConcepts.map((c) => (
                <li key={c.chapterId}>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                  <p className="sdna-concepts__meta">
                    {c.layout} · {c.motion.replace(/_/g, " ")}
                  </p>
                  <div className="sdna-concepts__swatch">
                    {c.palette.map((color) => (
                      <span key={color} style={{ background: color }} />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {section === "art" ? (
          <section className="sdna-panel sdna-panel--art">
            <h2>Art Direction</h2>
            <p className="sdna-panel__identity">{experience.artDirection.visualIdentity}</p>
            <dl className="sdna-art-grid">
              <div><dt>Lighting</dt><dd>{experience.artDirection.lighting}</dd></div>
              <div><dt>Texture</dt><dd>{experience.artDirection.texture}</dd></div>
              <div><dt>Motion</dt><dd>{experience.artDirection.motionStyle}</dd></div>
              <div><dt>Exhibit</dt><dd>{experience.artDirection.museumExhibitStyle}</dd></div>
            </dl>
            <div className="sdna-art-swatches">
              {experience.artDirection.colorField.map((c) => (
                <span key={c} style={{ background: c }} title={c} />
              ))}
            </div>
            <blockquote>{experience.artDirection.openingBeat}</blockquote>
            <blockquote>{experience.artDirection.closingBeat}</blockquote>
          </section>
        ) : null}

        {section === "sequence" ? (
          <section className="sdna-panel">
            <h2>Audience Sequence</h2>
            <ol className="sdna-sequence">
              {experience.audienceSequence.map((beat) => (
                <li key={beat.chapterId}>
                  <span className="sdna-sequence__order">{beat.order}</span>
                  <div>
                    <strong>{beat.title}</strong>
                    <p>{beat.emotionalGoal}</p>
                    <span>{beat.pacing} · ~{beat.dwellSeconds}s</span>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {section === "preview" ? (
          <section className="sdna-panel">
            <h2>Preview Wall</h2>
            <div className="sdna-preview-wall">
              {experience.previewWall.map((card) => (
                <article key={card.chapterId} className={`sdna-preview-card sdna-preview-card--${card.priority}`}>
                  <p className="sdna-preview-card__mood">{card.mood}</p>
                  <h3>{card.title}</h3>
                  <p>{card.layout}</p>
                  <p className="sdna-preview-card__motion">{card.motion}</p>
                  <div className="sdna-preview-card__palette">
                    {card.palette.map((c) => (
                      <span key={c} style={{ background: c }} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {section === "review" ? (
          <section className="sdna-panel">
            <h2>Creative Review</h2>
            <p className="sdna-review-score">{experience.review.overallScore}/100</p>
            <p>{experience.review.verdict}</p>
            <dl className="sdna-review-grid">
              {experience.review.dimensions.map((d) => (
                <div key={d.id}>
                  <dt>{d.label}</dt>
                  <dd>{d.score}</dd>
                  <p>{d.note}</p>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {section === "production" ? (
          <section className="sdna-panel">
            <h2>Production Readiness</h2>
            <p className="sdna-review-score">{experience.productionReadiness.score}/100</p>
            <ul className="sdna-checks">
              {experience.productionReadiness.checks.map((c) => (
                <li key={c.id} className={c.passed ? "is-pass" : "is-fail"}>
                  <strong>{c.label}</strong>
                  <span>{c.note}</span>
                </li>
              ))}
            </ul>
            <h3>Publisher integration notes</h3>
            <ul className="sdna-publisher-notes">
              {experience.productionReadiness.publisherNotes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
