"use client";

import Link from "next/link";

import type { ArchitectureDoc } from "@/lib/atlas/architecture-content";

type Props = {
  doc: ArchitectureDoc;
};

export function AtlasArchitectureView({ doc }: Props) {
  return (
    <div className="atlas-arch">
      <header className="atlas-arch__hero">
        <p className="atlas-arch__eyebrow">Atlas Encyclopedia</p>
        <h1 className="atlas-arch__title">Architecture</h1>
        <p className="atlas-arch__lead">
          Permanent product documentation — not a generated report. Updated{" "}
          {new Date(doc.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          .
        </p>
      </header>

      <section className="atlas-arch__status" aria-label="Current sprint status">
        <h2 className="atlas-arch__section-title">Current Sprint</h2>
        <dl className="atlas-arch__status-grid">
          <div>
            <dt>Sprint</dt>
            <dd>{doc.sprint}</dd>
          </div>
          <div>
            <dt>Current Milestone</dt>
            <dd>{doc.milestone}</dd>
          </div>
          <div>
            <dt>Current Phase</dt>
            <dd>{doc.phase}</dd>
          </div>
        </dl>
      </section>

      <section className="atlas-arch__section" aria-labelledby="philosophy-heading">
        <h2 id="philosophy-heading" className="atlas-arch__section-title">
          Current Philosophy
        </h2>
        <ul className="atlas-arch__list">
          {doc.philosophy.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      {doc.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="atlas-arch__section"
          aria-labelledby={`${section.id}-heading`}
        >
          <h2 id={`${section.id}-heading`} className="atlas-arch__section-title">
            {section.title}
          </h2>
          {section.body ? <p className="atlas-arch__body">{section.body}</p> : null}
          {section.items ? (
            <dl className="atlas-arch__items">
              {section.items.map((item) => (
                <div key={item.term}>
                  <dt>{item.term}</dt>
                  <dd>{item.detail}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>
      ))}

      <p className="atlas-arch__back">
        <Link href="/ops">← Command Center</Link>
        {" · "}
        <Link href="/ops/atlas/system">System Map</Link>
        {" · "}
        <Link href="/ops/library">Library</Link>
      </p>
    </div>
  );
}
