"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CollectorReadyPanel } from "@/components/ops/studio/CollectorReadyPanel";
import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";
import {
  filterLibraryCards,
  type CollectorLibraryCard,
  type CollectorLibraryIndex,
} from "@/lib/ops/studio/collector/library-shared";

type Props = {
  index: CollectorLibraryIndex;
};

function formatLastUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LibraryPackageCard({ card }: { card: CollectorLibraryCard }) {
  return (
    <article className="ops-collector-lib__card">
      <div className="ops-collector-lib__card-art" aria-hidden>
        {card.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.heroImageUrl} alt="" className="ops-collector-lib__card-image" />
        ) : (
          <div className="ops-collector-lib__card-placeholder">♫</div>
        )}
      </div>
      <div className="ops-collector-lib__card-body">
        <p className="ops-collector-lib__card-artist">{card.artist}</p>
        <h3 className="ops-collector-lib__card-title">{card.title}</h3>
        {card.performanceCount > 0 ? (
          <div className="ops-collector-lib__card-performances">
            <p className="ops-collector-lib__card-performances-label">
              {card.performanceCount}{" "}
              {card.performanceCount === 1 ? "performance" : "performances"}
            </p>
            <p className="ops-collector-lib__card-performances-list">
              {card.performanceTitles.join(" · ")}
            </p>
          </div>
        ) : (
          <p className="ops-collector-lib__card-performances-label">No performances on file</p>
        )}
        <dl className="ops-collector-lib__card-meta">
          <div>
            <dt>Knowledge</dt>
            <dd>{card.knowledgeTier}</dd>
          </div>
          <div>
            <dt>Discoveries</dt>
            <dd>{card.discoveryCount}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{formatLastUpdated(card.lastUpdated)}</dd>
          </div>
        </dl>
        <Link className="ops-collector-lib__card-cta" href={card.href}>
          Open Package →
        </Link>
      </div>
    </article>
  );
}

function RecentCard({ card }: { card: CollectorLibraryCard }) {
  return (
    <article className="ops-collector-lib__recent-card">
      <p className="ops-collector-lib__recent-artist">{card.artist}</p>
      <h3 className="ops-collector-lib__recent-title">{card.title}</h3>
      {card.performanceCount > 0 ? (
        <p className="ops-collector-lib__recent-performances">
          {card.performanceCount}{" "}
          {card.performanceCount === 1 ? "performance" : "performances"}
          <span>{card.performanceTitles.slice(0, 3).join(" · ")}</span>
        </p>
      ) : null}
      <p className="ops-collector-lib__recent-knowledge">
        Knowledge
        <span>{card.knowledgeTier}</span>
      </p>
      <Link className="ops-collector-lib__recent-cta" href={card.href}>
        Open Package →
      </Link>
    </article>
  );
}

export function CollectorLibraryHome({ index }: Props) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => filterLibraryCards(index.packages, query),
    [index.packages, query],
  );
  const isSearching = query.trim().length > 0;
  const showEmpty = index.packages.length === 0;

  return (
    <div className="ops-collector-lib">
      <SongWorkspaceTabs active="research" />

      <header className="ops-collector-lib__hero">
        <p className="ops-collector-lib__eyebrow">Collector</p>
        <h1 className="ops-collector-lib__title">Research Library</h1>
        <p className="ops-collector-lib__count">
          {index.stats.packageCount}{" "}
          {index.stats.packageCount === 1 ? "package" : "packages"} available
        </p>
      </header>

      <CollectorReadyPanel show={showEmpty} />

      {!showEmpty ? (
        <>
          <section className="ops-collector-lib__search-panel" aria-labelledby="collector-lib-search">
            <h2 id="collector-lib-search" className="ops-collector-lib__section-label">
              Search
            </h2>
            <label className="ops-collector-lib__search-label" htmlFor="collector-lib-query">
              Artist, title, or RVTR
            </label>
            <input
              id="collector-lib-query"
              className="ops-collector-lib__search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the research library…"
              autoComplete="off"
            />
            {isSearching ? (
              <p className="ops-collector-lib__search-hint">
                {filtered.length} {filtered.length === 1 ? "match" : "matches"}
              </p>
            ) : null}
          </section>

          {!isSearching && index.recent.length > 0 ? (
            <section className="ops-collector-lib__section" aria-labelledby="collector-lib-recent">
              <h2 id="collector-lib-recent" className="ops-collector-lib__section-title">
                Recently Completed
              </h2>
              <div className="ops-collector-lib__recent-grid">
                {index.recent.slice(0, 6).map((card) => (
                  <RecentCard key={card.rvtr} card={card} />
                ))}
              </div>
            </section>
          ) : null}

          <section className="ops-collector-lib__section" aria-labelledby="collector-lib-all">
            <h2 id="collector-lib-all" className="ops-collector-lib__section-title">
              {isSearching ? "Search Results" : "All Packages"}
            </h2>
            {filtered.length > 0 ? (
              <div className="ops-collector-lib__grid">
                {filtered.map((card) => (
                  <LibraryPackageCard key={card.rvtr} card={card} />
                ))}
              </div>
            ) : (
              <p className="ops-collector-lib__empty">No packages match your search.</p>
            )}
          </section>

          <section className="ops-collector-lib__stats" aria-labelledby="collector-lib-stats">
            <h2 id="collector-lib-stats" className="ops-collector-lib__section-title">
              Statistics
            </h2>
            <dl className="ops-collector-lib__stats-grid">
              <div className="ops-collector-lib__stat">
                <dt>Packages</dt>
                <dd>{index.stats.packageCount}</dd>
              </div>
              <div className="ops-collector-lib__stat ops-collector-lib__stat--wide">
                <dt>Knowledge Added</dt>
                <dd className="ops-collector-lib__tiers">
                  {index.stats.knowledgeTiers.map((tier, i) => (
                    <span key={`${tier}-${i}`}>{tier}</span>
                  ))}
                </dd>
              </div>
              <div className="ops-collector-lib__stat">
                <dt>Average Completion</dt>
                <dd>{index.stats.averageCompletion}%</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}

      <p className="ops-studio-detail__back-row">
        <Link className="ops-studio__back" href="/ops/studio">
          ← Studio
        </Link>
      </p>
    </div>
  );
}
