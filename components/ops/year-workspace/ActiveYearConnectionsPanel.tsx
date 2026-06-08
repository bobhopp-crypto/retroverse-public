"use client";

import type { ActiveYearConnections } from "@/lib/ops/year-workspace/active-year-bridge";
import {
  connectionsHaveActivity,
  yearsWithArtistHits,
  yearsWithSongHits,
} from "@/lib/ops/year-workspace/active-year-bridge";
import type { YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

function HitList(props: {
  blocks: Array<{ year: number; hits: Array<{ title: string; peak: number | null }> }>;
}) {
  return (
    <>
      {props.blocks.map(({ year, hits }) => (
        <section key={year} className="ops-ru-disc__section">
          <h4 className="ops-ru-disc__section-title">{year}</h4>
          <ul className="ops-ru-disc__list">
            {hits.map((h) => (
              <li key={`${year}-${h.title}-${h.peak}`}>
                <span className="ops-strong">{h.title}</span>
                {h.peak != null ? (
                  <span className="ops-mono ops-dim"> · #{h.peak}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

export function ActiveYearConnectionsInline(props: {
  row: YearWorkspaceRow | null;
  connections: ActiveYearConnections | null;
  loading: boolean;
  error: string | null;
}) {
  if (props.loading) {
    return <p className="ops-dim">Loading connections…</p>;
  }
  if (props.error) {
    return <p className="ops-empty">{props.error}</p>;
  }
  if (!props.connections) {
    return null;
  }

  const conn = props.connections;
  if (!connectionsHaveActivity(conn)) {
    return <p className="ops-ru-card__conn-empty">No active-year connections found.</p>;
  }

  const artistBlocks = yearsWithArtistHits(conn);
  const songBlocks = yearsWithSongHits(conn);

  return (
    <div className="ops-ru-card__conn">
      {artistBlocks.length > 0 ? (
        <div>
          <p className="ops-ru-card__label">Artist Connections</p>
          <HitList blocks={artistBlocks} />
        </div>
      ) : null}
      {songBlocks.length > 0 ? (
        <div>
          <p className="ops-ru-card__label">Song Connections</p>
          <HitList blocks={songBlocks} />
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Side panel — card inline preferred */
export function ActiveYearConnectionsPanel(props: {
  focusRow: YearWorkspaceRow | null;
  connections: ActiveYearConnections | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <aside className="ops-ru-disc" aria-label="Active year connections">
      <header className="ops-ru-disc__head">
        <div>
          <p className="ops-ru-disc__kicker">Active year connections</p>
          <h3 className="ops-ru-disc__title">
            {props.focusRow
              ? `${props.focusRow.artist} · ${props.focusRow.title}`
              : "Select a video"}
          </h3>
        </div>
        <button type="button" className="ops-btn" onClick={props.onClose}>
          Close
        </button>
      </header>
      <ActiveYearConnectionsInline
        row={props.focusRow}
        connections={props.connections}
        loading={props.loading}
        error={props.error}
      />
    </aside>
  );
}
