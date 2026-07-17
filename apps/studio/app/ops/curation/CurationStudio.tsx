"use client";

import { useMemo, useState } from "react";

import type { AlbumReviewQueueData, AlbumReviewQueueItem } from "@/lib/ops/integrity/load-integrity-dashboard";

type Decision =
  | "Approve Primary Album"
  | "Keep Current"
  | "Compilation Intended"
  | "Live Version"
  | "Alternate Recording"
  | "Needs Research"
  | "Skip";

type QueueType =
  | "Album Reviews"
  | "Artist Reviews"
  | "Duplicate Tracks"
  | "Alias Problems"
  | "Missing Covers"
  | "Featured Experiences";

const queueTypes: Array<{ label: QueueType; countFromAlbumQueue?: boolean }> = [
  { label: "Album Reviews", countFromAlbumQueue: true },
  { label: "Artist Reviews" },
  { label: "Duplicate Tracks" },
  { label: "Alias Problems" },
  { label: "Missing Covers" },
  { label: "Featured Experiences" },
];

const decisions: Decision[] = [
  "Approve Primary Album",
  "Keep Current",
  "Compilation Intended",
  "Live Version",
  "Alternate Recording",
  "Needs Research",
  "Skip",
];

const starStandard = [
  { stars: "★", label: "Imported" },
  { stars: "★★", label: "Canonical Identity Verified" },
  { stars: "★★★", label: "Billboard / Chart Verified" },
  { stars: "★★★★", label: "Public Experience Complete" },
  { stars: "★★★★★", label: "Curated (Bob Approved)" },
];

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function yearFor(item: AlbumReviewQueueItem): string {
  return item.firstChartDate?.slice(0, 4) ?? item.proposedReleaseYear?.toString() ?? "Year open";
}

function slugFor(value: string | null | undefined): string | null {
  const slug = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return slug || null;
}

function matchesSearch(item: AlbumReviewQueueItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    item.rvtr,
    item.title,
    item.artistName,
    item.proposedAlbumTitle,
    item.proposedRval,
    item.mediaEvidence.map((media) => media.sourcePath).join(" "),
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(q));
}

function previewLinks(item: AlbumReviewQueueItem) {
  const artistSlug = slugFor(item.artistName);
  return [
    { label: "Home", href: `/?q=${encodeURIComponent(item.rvtr)}` },
    { label: "Song", href: `/retroverse-2/song/${item.rvtr}` },
    { label: "Artist", href: artistSlug ? `/artist/${artistSlug}` : null },
    { label: "Album", href: item.proposedRval ? `/album/${item.proposedRval}` : null },
    { label: "Year", href: item.firstChartDate ? `/rv/${item.firstChartDate.slice(0, 4)}` : null },
  ];
}

function starReasons(item: AlbumReviewQueueItem, decision: Decision | undefined) {
  return [
    "VirtualDJ row is represented by an RVTR identity.",
    item.rvtr && item.title && item.artistName
      ? "RVTR, song title, and display artist are present."
      : "Canonical identity still needs confirmation.",
    item.firstChartDate || item.peakHot100Position || item.chartWeeks
      ? `Chart evidence: ${item.firstChartDate?.slice(0, 10) ?? "date open"}; peak ${item.peakHot100Position ?? "open"}; ${item.chartWeeks} weeks.`
      : "Billboard/chart evidence is not attached in this queue row.",
    item.proposedAlbumTitle && item.publicLinks.some((link) => link.href)
      ? "Song, album candidate, and public routes can be previewed."
      : "Public experience is incomplete until album and route evidence settle.",
    decision === "Approve Primary Album"
      ? "Local review state marks this as Bob-approved for a future write pass."
      : "Waiting for Bob approval; no star write is performed here.",
  ];
}

export function CurationStudio({
  queue,
  generatedAt,
}: {
  queue: AlbumReviewQueueData;
  generatedAt: string;
}) {
  const [activeQueue, setActiveQueue] = useState<QueueType>("Album Reviews");
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [decisionsByRvtr, setDecisionsByRvtr] = useState<Record<string, Decision>>({});

  const records = useMemo(() => {
    if (activeQueue !== "Album Reviews") return [];
    return queue.items.filter((item) => matchesSearch(item, query));
  }, [activeQueue, query, queue.items]);

  const index = records.length ? Math.min(cursor, records.length - 1) : 0;
  const item = records[index] ?? null;
  const currentDecision = item ? decisionsByRvtr[item.rvtr] : undefined;
  const reviewedCount = Object.keys(decisionsByRvtr).length;

  function move(delta: number) {
    if (!records.length) return;
    setCursor((value) => Math.min(Math.max(value + delta, 0), records.length - 1));
  }

  function jumpToRvtr() {
    const rvtr = query.trim().toUpperCase();
    const found = records.findIndex((record) => record.rvtr === rvtr);
    if (found >= 0) setCursor(found);
  }

  function decide(decision: Decision) {
    if (!item) return;
    setDecisionsByRvtr((state) => ({ ...state, [item.rvtr]: decision }));
    if (index < records.length - 1) setCursor(index + 1);
  }

  return (
    <main className="curation-studio">
      <section className="curation-topbar">
        <div>
          <p>Catalog Integrity</p>
          <h1>Curation Studio</h1>
        </div>
        <div className="curation-topbar__stats" aria-label="Queue status">
          <span>{records.length || queue.total} loaded</span>
          <span>{reviewedCount} local decisions</span>
          <span>{new Date(generatedAt).toLocaleString()}</span>
        </div>
        <a href="/ops/integrity">Integrity Dashboard</a>
      </section>

      <section className="curation-filters" aria-label="Filters">
        {queueTypes.map((type) => (
          <button
            key={type.label}
            type="button"
            className={activeQueue === type.label ? "is-active" : ""}
            onClick={() => {
              setActiveQueue(type.label);
              setCursor(0);
            }}
          >
            <span>{type.label}</span>
            <b>{type.countFromAlbumQueue ? queue.total : 0}</b>
          </button>
        ))}
      </section>

      <section className="curation-search" aria-label="Search and jump">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          placeholder="Search RVTR, artist, album, song, or VirtualDJ path"
        />
        <button type="button" onClick={jumpToRvtr}>Jump to RVTR</button>
        <button type="button" onClick={() => move(-1)}>Previous</button>
        <button type="button" onClick={() => move(1)}>Next</button>
        <button type="button" onClick={() => decide("Skip")} disabled={!item}>Skip</button>
      </section>

      {item ? (
        <>
          <section className="curation-grid">
            <aside className="curation-queue" aria-label="Queue">
              <div className="curation-panel-head">
                <p>Queue</p>
                <h2>{activeQueue}</h2>
              </div>
              <div className="curation-queue__list">
                {records.slice(Math.max(index - 8, 0), index + 14).map((record) => (
                  <button
                    key={record.rvtr}
                    type="button"
                    className={record.rvtr === item.rvtr ? "is-current" : ""}
                    onClick={() => setCursor(records.findIndex((candidate) => candidate.rvtr === record.rvtr))}
                  >
                    <span>{record.rvtr}</span>
                    <b>{record.title}</b>
                    <small>{decisionsByRvtr[record.rvtr] ?? record.artistName}</small>
                  </button>
                ))}
              </div>
            </aside>

            <section className="curation-current" aria-label="Current song">
              <div className="curation-cover" aria-label="Cover preview">
                <span>{item.proposedRval ?? item.rvtr}</span>
                <b>{item.coverSource ? "Artwork linked" : "Cover review"}</b>
              </div>
              <div className="curation-title">
                <p>{index + 1} of {records.length}</p>
                <h2>{item.title}</h2>
                <h3>{item.artistName}</h3>
              </div>
              <div className="curation-facts">
                <div><span>Album</span><b>{item.proposedAlbumTitle ?? "Open"}</b></div>
                <div><span>Year</span><b>{yearFor(item)}</b></div>
                <div><span>RVTR</span><b>{item.rvtr}</b></div>
                <div><span>RVAL</span><b>{item.proposedRval ?? "Open"}</b></div>
                <div><span>Confidence</span><b>{formatPercent(item.confidence)}</b></div>
                <div><span>Decision</span><b>{currentDecision ?? "Open"}</b></div>
              </div>
              <div className="curation-current__rows">
                <article>
                  <h4>Chart History</h4>
                  <p>{item.firstChartDate?.slice(0, 10) ?? "No chart date"} · peak {item.peakHot100Position ?? "open"} · {item.chartWeeks} weeks</p>
                </article>
                <article>
                  <h4>Current Canonical</h4>
                  <p>Artist {item.canonicalArtistId ?? "open"} · graph {item.graphTrackId ?? "open"} · {item.existingAlbumLinks.length} album links</p>
                </article>
                <article>
                  <h4>VirtualDJ Metadata</h4>
                  <p>{item.mediaEvidence[0]?.sourcePath ?? "No VirtualDJ/media path in this row"}</p>
                </article>
                <article>
                  <h4>Public Links</h4>
                  <nav>
                    {item.publicLinks.map((link) => (
                      link.href ? <a key={link.label} href={link.href}>{link.label}</a> : <span key={link.label}>{link.label}</span>
                    ))}
                  </nav>
                </article>
              </div>
            </section>

            <aside className="curation-evidence" aria-label="Evidence">
              <div className="curation-panel-head">
                <p>Evidence</p>
                <h2>Candidates</h2>
              </div>
              {[{
                albumId: item.proposedAlbumId ?? "proposed",
                albumTitle: item.proposedAlbumTitle ?? "No proposed album",
                rval: item.proposedRval,
                releaseYear: item.proposedReleaseYear,
                position: item.proposedPosition,
                slotTitle: item.proposedSlotTitle,
              }, ...item.competingCandidates.filter((candidate) => candidate.albumId !== item.proposedAlbumId)].map((candidate) => (
                <article key={`${candidate.albumId}-${candidate.position}`} className="curation-candidate">
                  <header>
                    <div>
                      <h3>{candidate.albumTitle}</h3>
                      <span>{candidate.rval ?? "No RVAL"} · {candidate.releaseYear ?? "No year"}</span>
                    </div>
                    <b>{formatPercent(item.confidence)}</b>
                  </header>
                  <dl>
                    <div><dt>Album type</dt><dd>{item.albumType}</dd></div>
                    <div><dt>Original studio</dt><dd>{item.albumType === "studio_candidate" ? "Likely" : "Question"}</dd></div>
                    <div><dt>Compilation</dt><dd>{item.albumType === "compilation" ? "Yes" : "No signal"}</dd></div>
                    <div><dt>Live</dt><dd>{item.albumType === "live" ? "Yes" : "No signal"}</dd></div>
                    <div><dt>Greatest hits</dt><dd>{/greatest|best|hits/i.test(candidate.albumTitle) ? "Signal" : "No signal"}</dd></div>
                    <div><dt>Track number</dt><dd>{candidate.position ?? "Open"}</dd></div>
                    <div><dt>Artwork</dt><dd>{item.coverSource ?? "Open"}</dd></div>
                  </dl>
                  <div className="curation-support">
                    <b>Supporting evidence</b>
                    <span>{candidate.slotTitle ?? item.title}</span>
                    {item.mediaEvidence.slice(0, 2).map((media, mediaIndex) => (
                      <small key={`${item.rvtr}-support-${mediaIndex}`}>{media.albumText ?? "No album text"} · {media.confidenceScore ?? "no"} media score</small>
                    ))}
                  </div>
                  <div className="curation-warnings">
                    {item.warnings.length ? item.warnings.map((warning) => <span key={warning}>{warning}</span>) : <span>No structural warnings</span>}
                  </div>
                </article>
              ))}
            </aside>
          </section>

          <section className="curation-lower">
            <div className="curation-preview" aria-label="Public preview">
              <div className="curation-panel-head">
                <p>Public Preview</p>
                <h2>Live Route Frames</h2>
              </div>
              <div className="curation-preview__grid">
                {previewLinks(item).map((link) => (
                  <article key={link.label}>
                    <header>
                      <b>{link.label}</b>
                      {link.href ? <a href={link.href}>Open</a> : <span>Missing</span>}
                    </header>
                    {link.href ? <iframe title={`${link.label} preview`} src={link.href} loading="lazy" /> : <div className="curation-preview__missing">No canonical route</div>}
                  </article>
                ))}
              </div>
            </div>

            <div className="curation-star-panel" aria-label="Star rating panel">
              <div className="curation-panel-head">
                <p>VirtualDJ</p>
                <h2>Future Star Status</h2>
              </div>
              {starStandard.map((star, starIndex) => (
                <article key={star.label}>
                  <b>{star.stars}</b>
                  <div>
                    <h3>{star.label}</h3>
                    <p>{starReasons(item, currentDecision)[starIndex]}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="curation-actions-plan" aria-label="Future actions">
              <div className="curation-panel-head">
                <p>Future Actions</p>
                <h2>Informational Only</h2>
              </div>
              {[
                "Album relationship repaired",
                "Integrity recalculated",
                "Public experience updated",
                "VirtualDJ star becomes ★★★★★",
                "Search refreshed",
              ].map((action) => <span key={action}>{action}</span>)}
            </div>
          </section>

          <section className="curation-decisionbar" aria-label="Decision controls">
            {decisions.map((decision) => (
              <button
                key={decision}
                type="button"
                className={currentDecision === decision ? "is-selected" : ""}
                onClick={() => decide(decision)}
              >
                {decision}
              </button>
            ))}
          </section>
        </>
      ) : (
        <section className="curation-empty">
          <h2>{activeQueue} is not wired to a review dataset yet.</h2>
          <p>This sprint keeps non-album queues visible as filters while avoiding automatic repair or database writes.</p>
        </section>
      )}
    </main>
  );
}
