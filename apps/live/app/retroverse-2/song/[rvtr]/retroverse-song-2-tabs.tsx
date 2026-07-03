"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type Song2Fact = {
  label: string;
  value: string;
};

export type Song2Item = {
  label: string;
  href?: string | null;
  meta?: string | null;
};

export type Song2Section = {
  eyebrow: string;
  title: string;
  copy?: string | null;
  facts?: Song2Fact[];
  items?: Song2Item[];
};

export type Song2Tab = {
  id: "overview" | "story" | "artist" | "culture" | "media" | "timeline";
  label: string;
  sections: Song2Section[];
};

function SectionItems({ items }: { items?: Song2Item[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rv2-song__item-grid">
      {items.map((item) =>
        item.href ? (
          <Link key={`${item.label}-${item.href}`} href={item.href} className="rv2-song__item">
            <span>{item.label}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </Link>
        ) : (
          <div key={`${item.label}-${item.meta ?? ""}`} className="rv2-song__item">
            <span>{item.label}</span>
            {item.meta ? <small>{item.meta}</small> : null}
          </div>
        ),
      )}
    </div>
  );
}

function SectionFacts({ facts }: { facts?: Song2Fact[] }) {
  if (!facts || facts.length === 0) return null;
  return (
    <dl className="rv2-song__stats">
      {facts.map((fact) => (
        <div key={`${fact.label}-${fact.value}`} className="rv2-song__stat">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function RetroverseSong2Tabs({ tabs }: { tabs: Song2Tab[] }) {
  const visibleTabs = useMemo(
    () => tabs.filter((tab) => tab.sections.length > 0),
    [tabs],
  );
  const [activeId, setActiveId] = useState<Song2Tab["id"]>("overview");
  const activeTab =
    visibleTabs.find((tab) => tab.id === activeId) ??
    visibleTabs[0] ??
    null;

  if (!activeTab) return null;

  return (
    <section className="rv2-song__experience" aria-label="Song experience">
      <nav className="rv2-song__tabs" aria-label="Song experience sections">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === activeTab.id ? "rv2-song__tab rv2-song__tab--active" : "rv2-song__tab"}
            aria-pressed={tab.id === activeTab.id}
            onClick={() => setActiveId(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="rv2-song__panel">
        {activeTab.sections.map((section) => (
          <article className="rv2-song__section" key={`${activeTab.id}-${section.eyebrow}-${section.title}`}>
            <p className="rv2-live__eyebrow">{section.eyebrow}</p>
            <h2>{section.title}</h2>
            {section.copy ? <p>{section.copy}</p> : null}
            <SectionFacts facts={section.facts} />
            <SectionItems items={section.items} />
          </article>
        ))}
      </div>
    </section>
  );
}
