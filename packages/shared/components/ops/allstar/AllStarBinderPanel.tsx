"use client";

import Link from "next/link";
import { useState } from "react";

import { displayCanonicalFile } from "@/lib/ops/allstar/canonical-display";
import type { BinderPage } from "@/lib/ops/allstar/intelligence/types";

type Props = {
  pages: BinderPage[];
};

export function AllStarBinderPanel({ pages }: Props) {
  const [activeId, setActiveId] = useState(pages[0]?.id ?? "");

  const active = pages.find((p) => p.id === activeId) ?? pages[0];

  if (!active) {
    return <p className="ops-allstar__empty">No binder pages yet. Preserve players to fill the album.</p>;
  }

  return (
    <div className="ops-allstar__binder">
      <nav className="ops-allstar__binder-tabs" aria-label="Binder pages">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            className={page.id === active.id ? "is-active" : undefined}
            onClick={() => setActiveId(page.id)}
          >
            {page.label}
          </button>
        ))}
      </nav>

      <section className="ops-allstar__binder-page">
        <header>
          <h2>{active.label}</h2>
          <p>{active.description}</p>
        </header>
        <div className="ops-allstar__binder-grid">
          {active.cards.map((card) => (
            <Link
              key={card.discId}
              href={`/ops/allstar/player/${card.discId}`}
              className="ops-allstar__binder-slot"
            >
              <img src={card.thumbnailUrl} alt="" />
              <strong>{card.player}</strong>
              <span>{card.position}</span>
              <code className="ops-allstar__canonical-name">{displayCanonicalFile(card)}</code>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
