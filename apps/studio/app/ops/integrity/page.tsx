import type { Metadata } from "next";

import { loadIntegrityDashboard } from "@/lib/ops/integrity/load-integrity-dashboard";

import "./integrity.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Integrity Dashboard — Retroverse Ops",
  robots: { index: false, follow: false },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function impactReason(cardId: string): string {
  switch (cardId) {
    case "unresolved-routes":
      return "Public pages can disagree when a canonical track cannot resolve every route relationship.";
    case "duplicate-tracks":
      return "Multiple RVTR candidates for the same logical song split search, playback, and page traces.";
    case "missing-covers":
      return "Missing artwork weakens album, song, and homepage previews.";
    case "alias-conflicts":
      return "One normalized label can send search to the wrong entity.";
    case "broken-artist-links":
      return "Artist pages can resolve by name instead of a stable canonical artist relationship.";
    case "broken-album-links":
      return "Album pages and song pages can lose their canonical handoff.";
    case "duplicate-artists":
      return "Artist identity splits across slugs and display names.";
    case "duplicate-albums":
      return "Album identity splits across RVAL candidates and cover sources.";
    case "orphan-tracks":
      return "Graph tracks without canonical display rows cannot enter the public RVTR path.";
    case "multiple-canonical-candidates":
      return "A single artist/title can produce more than one chart-canonical candidate.";
    default:
      return "This category has the largest current affected-record count.";
  }
}

export default async function IntegrityPage(props: {
  searchParams?: Promise<{ q?: string; trace?: string; queue?: string }>;
}) {
  const searchParams = await props.searchParams;
  const q = searchParams?.q ?? "";
  const trace = searchParams?.trace ?? undefined;
  const queue = searchParams?.queue;
  const data = await loadIntegrityDashboard({ query: q, traceRvtr: trace, queue });

  if (!data.ok) {
    return (
      <main className="ops-page ops-integrity">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <section className="integrity-hero">
            <p>Catalog Integrity</p>
            <h1>Integrity Dashboard</h1>
            <span>{data.error}</span>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-page ops-integrity">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <section className="integrity-hero">
          <div>
            <p>Catalog Integrity</p>
            <h1>Integrity Dashboard</h1>
            <span>
              Read-only canonical resolution audit generated {new Date(data.generatedAt).toLocaleString()}.
              Cockpit status: {data.cockpitStatus}.
            </span>
          </div>
          <div className="integrity-hero__actions">
            <a href="/ops/integrity?queue=album-review">Album Review</a>
            <a href="/ops">Ops</a>
          </div>
        </section>

        <section className="integrity-search" aria-label="Trace search">
          <form action="/ops/integrity">
            <label htmlFor="integrity-q">Search Trace</label>
            <input
              id="integrity-q"
              name="q"
              defaultValue={data.searchQuery}
              placeholder="RVTR, song title, artist, or album"
            />
            <button type="submit">Search</button>
          </form>
          {data.searchResults.length ? (
            <div className="integrity-search__results">
              {data.searchResults.map((result) => (
                <a key={result.rvtr} href={`/ops/integrity?q=${encodeURIComponent(data.searchQuery)}&trace=${encodeURIComponent(result.rvtr)}`}>
                  <strong>{result.title}</strong>
                  <span>{result.artistName} · {result.rvtr}</span>
                  <small>{result.matchType}{result.year ? ` · ${result.year}` : ""}</small>
                </a>
              ))}
            </div>
          ) : data.searchQuery ? (
            <p className="integrity-search__empty">No matching canonical tracks found.</p>
          ) : null}
        </section>

        <section className="integrity-cards" aria-label="Integrity summary">
          {data.cards.map((card) => (
            <a key={card.id} className={`integrity-card integrity-card--${card.severity}`} href={`#${card.id}`}>
              <span>{card.title}</span>
              <strong>{formatNumber(card.count)}</strong>
              <small>{card.description}</small>
            </a>
          ))}
        </section>

        <section className="integrity-priority" aria-label="Highest-impact problems">
          <div className="integrity-section-head">
            <p>Top five</p>
            <h2>Highest-Impact Problems</h2>
            <span>Ranked by affected-record count across the live read-only checks.</span>
          </div>
          <div className="integrity-priority__list">
            {data.priorityCards.map((card) => (
              <a key={card.id} href={`#${card.id}`}>
                <strong>{card.title}</strong>
                <span>{formatNumber(card.count)}</span>
                <small>{impactReason(card.id)}</small>
                <b>View Records</b>
              </a>
            ))}
          </div>
        </section>

        {data.trace ? (
          <section className="integrity-trace" aria-label="Canonical trace">
            <div className="integrity-section-head">
              <p>Record Detail</p>
              <h2>{data.trace.rvtr}</h2>
              <span>{data.trace.artistName} — {data.trace.title}</span>
            </div>
            <div className="integrity-trace-grid">
              <div>
                <h3>Canonical Chain</h3>
                <dl>
                  <div><dt>Track</dt><dd>{data.trace.rvtr}</dd></div>
                  <div><dt>Artist</dt><dd>{data.trace.canonicalArtistId ? `${data.trace.canonicalArtistId} · ${data.trace.artistName}` : data.trace.artistName ?? "Missing"}</dd></div>
                  <div><dt>Album</dt><dd>{data.trace.canonicalAlbumId ? `${data.trace.canonicalAlbumId} · ${data.trace.albumTitle ?? ""}` : data.trace.albumTitle ?? "Missing"}</dd></div>
                  <div><dt>Year</dt><dd>{data.trace.year ?? "Missing"}</dd></div>
                  <div><dt>Artwork</dt><dd>{data.trace.artworkSource ?? "Missing"}</dd></div>
                </dl>
              </div>
              <div>
                <h3>Aliases</h3>
                <ul>
                  {data.trace.aliases.length ? data.trace.aliases.map((alias) => (
                    <li key={alias.label}>
                      <b>{alias.label}</b>
                      <small>{alias.source}</small>
                    </li>
                  )) : <li>No aliases found in display rows.</li>}
                </ul>
              </div>
              <div>
                <h3>Charts</h3>
                <ul>
                  {data.trace.chartRelationships.length ? data.trace.chartRelationships.slice(0, 6).map((chart) => (
                    <li key={`${chart.chartName}-${chart.chartDate}-${chart.rank}`}>
                      <b>{chart.chartName} · #{chart.rank}</b>
                      <small>{chart.chartDate.slice(0, 10)} · {chart.resolver}</small>
                    </li>
                  )) : <li>No chart relationships found.</li>}
                </ul>
              </div>
              <div>
                <h3>Public Pages</h3>
                <ul>
                  {data.trace.publicPages.map((page) => (
                    <li key={page.label}>
                      <a href={page.href}>{page.label}</a>
                      <span>{page.status}</span>
                      <small>{page.resolver}</small>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Integrity</h3>
                <ul>
                  {data.trace.findings.map((finding) => (
                    <li key={finding.label}>
                      <span className={finding.ok ? "integrity-ok" : "integrity-warn"}>{finding.ok ? "OK" : "Warn"}</span>
                      <b>{finding.label}</b>
                      <small>{finding.note}</small>
                      <small>{finding.resolver}</small>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {data.albumReviewQueue ? (
          <section className="integrity-album-review" aria-label="Album review queue">
            <div className="integrity-section-head">
              <p>Manual Queue</p>
              <h2>Canonical Album Review</h2>
              <span>
                {formatNumber(data.albumReviewQueue.total)} candidates loaded · {formatNumber(data.albumReviewQueue.bobReview)} need review · generated {new Date(data.albumReviewQueue.generatedAt).toLocaleString()}.
              </span>
            </div>
            <div className="integrity-review-summary">
              <div><b>{formatNumber(data.albumReviewQueue.promotedReadOnly)}</b><span>clean studio candidates</span></div>
              <div><b>{formatNumber(data.albumReviewQueue.bobReview)}</b><span>review required</span></div>
              <div><b>{formatNumber(data.albumReviewQueue.unresolved)}</b><span>left unresolved</span></div>
            </div>
            <div className="integrity-review-list">
              {data.albumReviewQueue.items.map((item) => (
                <article key={item.rvtr} className="integrity-review-item">
                  <header>
                    <div>
                      <p>{item.rvtr}</p>
                      <h3>{item.title}</h3>
                      <span>{item.artistName} · artist {item.canonicalArtistId ?? "missing"} · graph {item.graphTrackId ?? "missing"}</span>
                    </div>
                    <strong>{Math.round(item.confidence * 100)}%</strong>
                  </header>
                  <div className="integrity-review-grid">
                    <div>
                      <h4>Chart</h4>
                      <p>{item.firstChartDate?.slice(0, 10) ?? "No chart date"}</p>
                      <small>Peak {item.peakHot100Position ?? "—"} · {item.chartWeeks} weeks</small>
                    </div>
                    <div>
                      <h4>Proposed Album</h4>
                      <p>{item.proposedAlbumTitle ?? "No proposal"}</p>
                      <small>{item.proposedRval ?? "No RVAL"} · {item.proposedReleaseYear ?? "No year"} · slot {item.proposedPosition ?? "—"}</small>
                    </div>
                    <div>
                      <h4>Album Type</h4>
                      <p>{item.albumType}</p>
                      <small>{item.coverSource ? "cover linked" : "no cover link"}</small>
                    </div>
                  </div>
                  <div className="integrity-review-evidence">
                    <div>
                      <h4>Competing Candidates</h4>
                      <ul>
                        {item.competingCandidates.slice(0, 4).map((candidate) => (
                          <li key={`${item.rvtr}-${candidate.albumId}-${candidate.position}`}>
                            <b>{candidate.albumTitle}</b>
                            <small>{candidate.rval ?? "No RVAL"} · {candidate.releaseYear ?? "No year"} · slot {candidate.position ?? "—"} · {candidate.slotTitle ?? "No title"}</small>
                          </li>
                        ))}
                        {item.competingCandidates.length === 0 ? <li>No competing slots found.</li> : null}
                      </ul>
                    </div>
                    <div>
                      <h4>Media Evidence</h4>
                      <ul>
                        {item.mediaEvidence.slice(0, 3).map((media, index) => (
                          <li key={`${item.rvtr}-media-${index}`}>
                            <b>{media.albumText ?? "No media album"}</b>
                            <small>{media.artistText ?? "Unknown"} — {media.titleText ?? "Unknown"} · {media.durationSeconds ?? "—"}s</small>
                          </li>
                        ))}
                        {item.mediaEvidence.length === 0 ? <li>No media link evidence.</li> : null}
                      </ul>
                    </div>
                    <div>
                      <h4>Warnings</h4>
                      <ul>
                        {item.warnings.map((warning) => <li key={`${item.rvtr}-${warning}`}>{warning}</li>)}
                        {item.warnings.length === 0 ? <li>None from structural checks.</li> : null}
                      </ul>
                    </div>
                  </div>
                  <div className="integrity-review-actions" aria-label={`Reviewer choices for ${item.rvtr}`}>
                    <button type="button">Approve proposed original album</button>
                    <button type="button">Choose another listed candidate</button>
                    <button type="button">Compilation is intentional</button>
                    <button type="button">Live/remix/alternate recording</button>
                    <button type="button">Leave unresolved</button>
                  </div>
                  <nav className="integrity-review-links" aria-label={`Public links for ${item.rvtr}`}>
                    {item.publicLinks.map((link) => (
                      link.href ? <a key={link.label} href={link.href}>{link.label}</a> : <span key={link.label}>{link.label}</span>
                    ))}
                  </nav>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="integrity-details" aria-label="Affected records">
          {data.cards.map((card) => (
            <section key={card.id} id={card.id} className="integrity-detail">
              <div className="integrity-section-head">
                <p>{formatNumber(card.count)} affected</p>
                <h2>{card.title}</h2>
                <span>{card.description}</span>
              </div>
              <div className="integrity-table">
                {card.records.map((record) => (
                  <a key={`${card.id}-${record.id}-${record.label}`} href={record.href ?? "#"} aria-disabled={!record.href}>
                    <strong>{record.label}</strong>
                    <span>{record.id}</span>
                    <small>{record.detail}</small>
                  </a>
                ))}
                {card.records.length === 0 ? <p>No affected records in this category.</p> : null}
              </div>
            </section>
          ))}
        </section>
      </div>
    </main>
  );
}
