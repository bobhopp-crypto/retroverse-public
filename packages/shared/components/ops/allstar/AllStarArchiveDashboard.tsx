"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type {
  AllStarLeaderboardEntry,
  AllStarLiveArchive,
  AllStarLiveProcessing,
  AllStarOutcomeSummaryItem,
} from "@/lib/ops/allstar/types";
import type { PreservationMilestone } from "@/lib/ops/allstar/intelligence/types";
import { AllStarMilestonesPanel } from "@/components/ops/allstar/AllStarMilestonesPanel";

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function StatusPill({ label, tone }: { label: string; tone: "ok" | "warn" | "pending" | "live" }) {
  return <span className={`ops-allstar__live-pill ops-allstar__live-pill--${tone}`}>{label}</span>;
}

function LiveProcessingPanel({ live }: { live: AllStarLiveProcessing }) {
  const geoTone =
    live.geometryStatus === "ok" ? "ok" : live.geometryStatus === "processing" ? "live" : "warn";
  const ocrTone =
    live.ocrStatus === "complete" ? "ok" : live.ocrStatus === "processing" ? "live" : "warn";
  const valTone =
    live.validationStatus === "validated"
      ? "ok"
      : live.validationStatus === "processing"
        ? "live"
        : "warn";

  return (
    <section className="ops-allstar__archive-panel ops-allstar__archive-panel--live">
      <div className="ops-allstar__archive-panel-head">
        <h2>Live Processing Feed</h2>
        <StatusPill label="Extracting now" tone="live" />
      </div>
      <div className="ops-allstar__live-grid">
        <div>
          <p className="ops-allstar__live-kicker">Current player</p>
          <p className="ops-allstar__live-player">{live.player || "Scanning…"}</p>
          <p className="ops-allstar__live-meta">{live.position || "Position pending"}</p>
          <p className="ops-allstar__live-file">{live.scanFilename}</p>
        </div>
        <div className="ops-allstar__live-statuses">
          <div>
            <span>Geometry</span>
            <StatusPill label={live.geometryStatus} tone={geoTone} />
          </div>
          <div>
            <span>OCR</span>
            <StatusPill label={live.ocrStatus} tone={ocrTone} />
          </div>
          <div>
            <span>Validation</span>
            <StatusPill label={live.validationStatus} tone={valTone} />
          </div>
        </div>
      </div>
      {live.outcomeSummary.length ? (
        <div className="ops-allstar__live-summary">
          {live.outcomeSummary.map((item: AllStarOutcomeSummaryItem) => (
            <div key={item.key}>
              <strong>{item.label}</strong>
              <span>{pct(item.probability)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LeaderboardColumn({
  title,
  entries,
}: {
  title: string;
  entries: AllStarLeaderboardEntry[];
}) {
  return (
    <article className="ops-allstar__leaderboard">
      <h3>{title}</h3>
      {entries.length ? (
        <ol>
          {entries.map((entry) => (
            <li key={`${title}-${entry.discId}`}>
              <Link href={`/ops/allstar/player/${entry.discId}`}>
                <strong>{entry.player}</strong>
              </Link>
              <span>{pct(entry.value)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="ops-allstar__empty">Waiting for preserved discs…</p>
      )}
    </article>
  );
}

export function AllStarArchiveDashboard() {
  const [data, setData] = useState<AllStarLiveArchive | null>(null);
  const [milestones, setMilestones] = useState<PreservationMilestone[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [liveRes, intelRes] = await Promise.all([
        fetch("/api/ops/allstar/live", { cache: "no-store" }),
        fetch("/api/ops/allstar/intelligence", { cache: "no-store" }),
      ]);
      if (!liveRes.ok) throw new Error("Live archive unavailable");
      const payload = (await liveRes.json()) as AllStarLiveArchive;
      setData(payload);
      if (intelRes.ok) {
        const intel = (await intelRes.json()) as { milestones: PreservationMilestone[] };
        setMilestones(intel.milestones ?? []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load archive");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, data?.extractionRunning ? 2500 : 8000);
    return () => window.clearInterval(interval);
  }, [refresh, data?.extractionRunning]);

  if (error && !data) {
    return <p className="ops-allstar__empty">{error}</p>;
  }

  if (!data) {
    return <p className="ops-allstar__empty">Loading living archive…</p>;
  }

  const tickerItems = data.ticker.length
    ? data.ticker
    : [{ id: "idle", message: "⚾ Archive standing by for next disc extraction…", at: data.updatedAt }];

  return (
    <div className="ops-allstar__archive">
      <div className="ops-allstar__ticker" aria-live="polite">
        <div className="ops-allstar__ticker-track">
          {[...tickerItems, ...tickerItems].map((event, index) => (
            <span key={`${event.id}-${index}`}>{event.message}</span>
          ))}
        </div>
      </div>

      <div className="ops-allstar__archive-hero">
        <div>
          <p className="ops-allstar__archive-kicker">Living Digital Archive</p>
          <p className="ops-allstar__archive-lead">
            {data.stats.processedScans} preserved · {data.stats.pendingScans} scans awaiting
            reconstruction · {data.stats.totalScans} total discs in the collection
          </p>
          <p className="ops-allstar__archive-ops-links">
            <Link href="/ops/allstar/preserve">Preserve →</Link>
            <Link href="/ops/allstar/review">Review →</Link>
            <Link href="/ops/allstar/audit">Audit →</Link>
          </p>
        </div>
        <div className="ops-allstar__archive-stats">
          <div>
            <strong>{data.stats.processedScans}</strong>
            <span>Preserved</span>
          </div>
          <div>
            <strong>{data.hallOfFame.preserved}</strong>
            <span>HoF saved</span>
          </div>
          <div>
            <strong>{data.stats.geometryOk}</strong>
            <span>Geometry OK</span>
          </div>
        </div>
      </div>

      {data.harvest ? (
        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h2>Collection Harvest</h2>
          <div className="ops-allstar__research-grid">
            <article className="ops-allstar__research-stat">
              <strong>Preserved</strong>
              <span>{data.harvest.preservedPercent}%</span>
            </article>
            <article className="ops-allstar__research-stat">
              <strong>Reviewed</strong>
              <span>{data.harvest.reviewedPercent}%</span>
            </article>
            <article className="ops-allstar__research-stat">
              <strong>Enriched</strong>
              <span>{data.harvest.enrichedPercent}%</span>
            </article>
            <article className="ops-allstar__research-stat">
              <strong>HoF complete</strong>
              <span>{data.harvest.hallOfFamePercent}%</span>
            </article>
            <article className="ops-allstar__research-stat">
              <strong>Avg archive conf.</strong>
              <span>{data.harvest.averageArchiveConfidence}</span>
            </article>
          </div>
        </section>
      ) : null}

      {data.extractionRunning && data.liveProcessing ? (
        <LiveProcessingPanel live={data.liveProcessing} />
      ) : (
        <section className="ops-allstar__archive-panel">
          <div className="ops-allstar__archive-panel-head">
            <h2>Live Processing Feed</h2>
            <StatusPill label="Standby" tone="pending" />
          </div>
          <p className="ops-allstar__empty">
            No active extraction. Run the pipeline to watch players enter the archive in real time.
          </p>
        </section>
      )}

      <div className="ops-allstar__archive-grid">
        <section className="ops-allstar__archive-panel">
          <h2>Recently Preserved</h2>
          {data.recentlyPreserved.length ? (
            <div className="ops-allstar__card-grid">
              {data.recentlyPreserved.map((tile) => (
                <Link
                  key={tile.id}
                  href={`/ops/allstar/player/${tile.id}`}
                  className="ops-allstar__card"
                >
                  <img src={tile.thumbnailUrl} alt="" className="ops-allstar__card-art" />
                  <div className="ops-allstar__card-body">
                    {tile.hallOfFame ? <span className="ops-allstar__card-badge">HoF</span> : null}
                    <strong>{tile.player}</strong>
                    <span>{tile.position}</span>
                    <time dateTime={tile.preservedAt}>{formatTime(tile.preservedAt)}</time>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="ops-allstar__empty">No preserved players yet.</p>
          )}
        </section>

        <section className="ops-allstar__archive-panel">
          <h2>Hall of Fame Preservation Tracker</h2>
          <div className="ops-allstar__hof-tracker">
            <p className="ops-allstar__hof-percent">{data.hallOfFame.percent}%</p>
            <p>
              <strong>{data.hallOfFame.preserved}</strong> preserved of{" "}
              <strong>{data.hallOfFame.totalIdentified}</strong> identified Hall of Fame discs
            </p>
            {data.hallOfFame.recentPlayer ? (
              <p className="ops-allstar__hof-recent">
                Latest: {data.hallOfFame.recentPlayer}
                {data.hallOfFame.recentPreservedAt
                  ? ` · ${formatTime(data.hallOfFame.recentPreservedAt)}`
                  : null}
              </p>
            ) : (
              <p className="ops-allstar__hof-recent">No Hall of Famers preserved yet.</p>
            )}
          </div>
        </section>

        {data.spotlight ? (
          <section className="ops-allstar__archive-panel ops-allstar__spotlight">
            <h2>Player Spotlight</h2>
            <p className="ops-allstar__spotlight-name">{data.spotlight.player}</p>
            <p className="ops-allstar__spotlight-position">{data.spotlight.position}</p>
            <p className="ops-allstar__spotlight-era">{data.spotlight.era}</p>
            <p className="ops-allstar__spotlight-fact">{data.spotlight.fact}</p>
            <p className="ops-allstar__spotlight-hr">HR probability {pct(data.spotlight.homeRunProbability)}</p>
            <Link href={`/ops/allstar/player/${data.spotlight.id}`}>Open player intelligence →</Link>
          </section>
        ) : null}

        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h2>Collection Overview</h2>
          <div className="ops-allstar__collection-grid">
            {data.collectionOverview.map((group) => (
              <article key={group.key}>
                <div className="ops-allstar__collection-head">
                  <strong>{group.label}</strong>
                  <span>
                    {group.preserved}/{group.total}
                  </span>
                </div>
                <div className="ops-allstar__bar-track">
                  <div
                    className="ops-allstar__bar-fill ops-allstar__bar-fill--archive"
                    style={{ width: `${group.percent}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h2>Live Leaderboards</h2>
          <div className="ops-allstar__leaderboard-grid">
            <LeaderboardColumn title="Home Run" entries={data.leaderboards.homeRun} />
            <LeaderboardColumn title="Walk" entries={data.leaderboards.walk} />
            <LeaderboardColumn title="Strikeout" entries={data.leaderboards.strikeout} />
            <LeaderboardColumn title="Singles" entries={data.leaderboards.singles} />
            <LeaderboardColumn title="Double" entries={data.leaderboards.double} />
          </div>
        </section>

        <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
          <h2>Interesting Findings</h2>
          {data.findings.length ? (
            <ul className="ops-allstar__findings">
              {data.findings.map((finding) => (
                <li key={finding.id}>
                  <strong>{finding.title}</strong>
                  <span>{finding.detail}</span>
                  {finding.player ? (
                    <Link href={finding.discId ? `/ops/allstar/player/${finding.discId}` : "#"}>
                      {finding.player}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops-allstar__empty">Discoveries appear as the archive grows.</p>
          )}
        </section>

        <AllStarMilestonesPanel milestones={milestones} />
      </div>
    </div>
  );
}
