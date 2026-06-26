"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";
import {
  confidenceLabel,
  filterEditorCards,
  storyStatusLabel,
  type EditorLibraryCard,
  type EditorLibraryIndex,
} from "@/lib/ops/studio/editor/library-shared";

type Props = {
  index: EditorLibraryIndex;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function statusClass(status: EditorLibraryCard["storyStatus"]): string {
  if (status === "ready") return "ops-editor-lib__status--ready";
  if (status === "submitted") return "ops-editor-lib__status--submitted";
  if (status === "not_ready") return "ops-editor-lib__status--progress";
  return "ops-editor-lib__status--new";
}

function StoryCard({ card }: { card: EditorLibraryCard }) {
  return (
    <article className="ops-editor-lib__card">
      <div className="ops-editor-lib__card-art" aria-hidden>
        {card.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.heroImageUrl} alt="" className="ops-editor-lib__card-image" />
        ) : (
          <div className="ops-editor-lib__card-placeholder">✎</div>
        )}
      </div>
      <div className="ops-editor-lib__card-body">
        <p className="ops-editor-lib__card-artist">{card.artist}</p>
        <h3 className="ops-editor-lib__card-title">{card.title}</h3>
        <p className={`ops-editor-lib__status ${statusClass(card.storyStatus)}`}>
          {storyStatusLabel(card.storyStatus)}
        </p>
        {card.performanceCount > 0 ? (
          <p className="ops-editor-lib__card-performances">
            {card.performanceCount}{" "}
            {card.performanceCount === 1 ? "performance" : "performances"}
          </p>
        ) : null}
        <dl className="ops-editor-lib__card-meta">
          <div>
            <dt>Confidence</dt>
            <dd>{confidenceLabel(card.confidence)}</dd>
          </div>
          <div>
            <dt>Last Edited</dt>
            <dd>{formatDate(card.lastUpdated)}</dd>
          </div>
        </dl>
        <Link className="ops-editor-lib__card-cta" href={card.href}>
          Open Story →
        </Link>
      </div>
    </article>
  );
}

export function EditorLibraryHome({ index }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => filterEditorCards(index.cards, query), [index.cards, query]);
  const isSearching = query.trim().length > 0;
  const showEmpty = index.cards.length === 0;

  return (
    <div className="ops-editor-lib">
      <SongWorkspaceTabs active="story" />

      <header className="ops-editor-lib__hero">
        <p className="ops-editor-lib__eyebrow">Editor</p>
        <h1 className="ops-editor-lib__title">Story Desk</h1>
        <p className="ops-editor-lib__lead">
          Transform Collector research into polished, editable story packages.
        </p>
        <p className="ops-editor-lib__count">
          {index.stats.storyCount} {index.stats.storyCount === 1 ? "story" : "stories"} on the
          desk · {index.cards.length} researched songs available
        </p>
      </header>

      {showEmpty ? (
        <section className="ops-editor-lib__empty-panel">
          <h2>No researched songs yet</h2>
          <p>Collector must finish research before stories appear on the Editor desk.</p>
          <Link className="ops-editor-lib__card-cta" href="/ops/studio/collector">
            Open Research Library →
          </Link>
        </section>
      ) : (
        <>
          <section className="ops-editor-lib__search-panel" aria-labelledby="editor-lib-search">
            <h2 id="editor-lib-search" className="ops-editor-lib__section-label">
              Search
            </h2>
            <label className="ops-editor-lib__search-label" htmlFor="editor-lib-query">
              Artist, title, or RVTR
            </label>
            <input
              id="editor-lib-query"
              className="ops-editor-lib__search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a story to edit…"
              autoComplete="off"
            />
            {isSearching ? (
              <p className="ops-editor-lib__search-hint">
                {filtered.length} {filtered.length === 1 ? "match" : "matches"}
              </p>
            ) : null}
          </section>

          {!isSearching && index.recent.length > 0 ? (
            <section className="ops-editor-lib__section" aria-labelledby="editor-lib-recent">
              <h2 id="editor-lib-recent" className="ops-editor-lib__section-title">
                Recently Edited
              </h2>
              <div className="ops-editor-lib__grid">
                {index.recent.slice(0, 6).map((card) => (
                  <StoryCard key={card.rvtr} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="ops-editor-lib__section" aria-labelledby="editor-lib-all">
            <h2 id="editor-lib-all" className="ops-editor-lib__section-title">
              {isSearching ? "Search Results" : "All Stories"}
            </h2>
            {filtered.length > 0 ? (
              <div className="ops-editor-lib__grid">
                {filtered.map((card) => (
                  <StoryCard key={card.rvtr} card={card} />
                ))}
              </div>
            ) : (
              <p className="ops-editor-lib__empty">No stories match your search.</p>
            )}
          </section>

          <section className="ops-editor-lib__stats" aria-labelledby="editor-lib-stats">
            <h2 id="editor-lib-stats" className="ops-editor-lib__section-title">
              Desk Statistics
            </h2>
            <dl className="ops-editor-lib__stats-grid">
              <div>
                <dt>Stories Started</dt>
                <dd>{index.stats.storyCount}</dd>
              </div>
              <div>
                <dt>Ready for Director</dt>
                <dd>{index.stats.readyForDirector}</dd>
              </div>
              <div>
                <dt>With Director</dt>
                <dd>{index.stats.submitted}</dd>
              </div>
              <div>
                <dt>Drafts</dt>
                <dd>{index.stats.draftCount}</dd>
              </div>
            </dl>
          </section>
        </>
      )}

      <p className="ops-studio-detail__back-row">
        <Link className="ops-studio__back" href="/ops/studio">
          ← Studio
        </Link>
      </p>
    </div>
  );
}
