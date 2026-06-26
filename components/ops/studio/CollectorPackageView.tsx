"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";
import type { CollectorLibraryCard } from "@/lib/ops/studio/collector/library-shared";
import {
  applyPerformanceSelection,
  buildPackageInvestigationView,
  coalesceInvestigationView,
  FUTURE_ANALYSIS_HOOKS,
  normalizeCollectorPackage,
  type CollectorInvestigationView,
  type PackageCardStatus,
} from "@/lib/ops/studio/collector/presentation";
import type { EditorHandoffStatus } from "@/lib/ops/studio/collector/package-contract";
import type { CollectorDashboardStats, CollectorPackage } from "@/lib/ops/studio/collector/types";

type CollectorPackagePageContext = {
  rvtr: string;
  package: CollectorPackage | null;
  investigation: CollectorInvestigationView | null;
  stats: CollectorDashboardStats;
  prev: CollectorLibraryCard | null;
  next: CollectorLibraryCard | null;
};

type Props = {
  initialContext: CollectorPackagePageContext;
};

function cardStatusClass(status: PackageCardStatus): string {
  if (status === "Ready") return "ops-collector__card-status--ready";
  if (status === "Partial") return "ops-collector__card-status--partial";
  return "ops-collector__card-status--missing";
}

function handoffStatusClass(status: EditorHandoffStatus): string {
  if (status === "Ready") return "ops-collector__handoff-status--ready";
  if (status === "Partial") return "ops-collector__handoff-status--partial";
  return "ops-collector__handoff-status--missing";
}

function handoffStatusSymbol(status: EditorHandoffStatus): string {
  if (status === "Ready") return "✓";
  if (status === "Partial") return "◐";
  return "○";
}

export function CollectorPackageView({ initialContext }: Props) {
  const [stats, setStats] = useState(initialContext.stats);
  const [investigation, setInvestigation] = useState(() =>
    coalesceInvestigationView(initialContext.investigation),
  );
  const [pkgSnapshot, setPkgSnapshot] = useState<CollectorPackage | null>(
    initialContext.package,
  );
  const [selectedPerformanceId, setSelectedPerformanceId] = useState<string | null>(
    initialContext.investigation?.selectedPerformanceId ?? null,
  );
  const rvtr = initialContext.rvtr;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/ops/studio/collector/progress?rvtr=${encodeURIComponent(rvtr)}`,
          { cache: "no-store", credentials: "include" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          stats: CollectorDashboardStats;
          investigation?: CollectorInvestigationView;
          package?: CollectorPackage | null;
        };
        if (cancelled || !data.ok) return;
        setStats(data.stats);
        const normalized = data.package ? normalizeCollectorPackage(data.package) : null;
        if (normalized) setPkgSnapshot(normalized);

        const baseInvestigation =
          data.investigation ??
          (normalized ? buildPackageInvestigationView(normalized, data.stats) : null);

        if (baseInvestigation) {
          const safeInvestigation = coalesceInvestigationView(baseInvestigation);
          if (normalized && selectedPerformanceId) {
            setInvestigation(
              applyPerformanceSelection(safeInvestigation, normalized, selectedPerformanceId),
            );
          } else {
            setInvestigation(safeInvestigation);
            if (safeInvestigation.selectedPerformanceId) {
              setSelectedPerformanceId(safeInvestigation.selectedPerformanceId);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [rvtr, selectedPerformanceId]);

  function selectPerformance(performanceId: string) {
    setSelectedPerformanceId(performanceId);
    if (!pkgSnapshot) return;
    setInvestigation((current) =>
      applyPerformanceSelection(current, normalizeCollectorPackage(pkgSnapshot), performanceId),
    );
  }

  const isResearching =
    stats.progress.currentSong?.rvtr === rvtr &&
    (stats.status === "researching" || stats.status === "waiting");
  const view = investigation;
  const normalizedPkg = pkgSnapshot ? normalizeCollectorPackage(pkgSnapshot) : null;
  const activePerformance =
    normalizedPkg?.performances?.find((entry) => entry.id === selectedPerformanceId) ??
    normalizedPkg?.performances?.[0] ??
    null;
  const crowdAssets =
    activePerformance?.visualAssets?.extraction?.assets?.filter(
      (asset) => asset.category === "Crowd",
    ) ?? [];

  return (
    <div className="ops-collector">
      <SongWorkspaceTabs active="research" rvtr={rvtr} />

      <p className="ops-collector__library-back">
        <Link className="ops-studio__back" href="/ops/studio/collector">
          ← Research Library
        </Link>
      </p>

      <section className="ops-collector__hero" aria-labelledby="collector-investigation">
        <div className="ops-collector__hero-art" aria-hidden>
          {view.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={view.coverUrl} alt="" className="ops-collector__cover" />
          ) : (
            <div className="ops-collector__cover ops-collector__cover--placeholder">
              <span>♫</span>
            </div>
          )}
        </div>
        <div className="ops-collector__hero-body">
          <p
            id="collector-investigation"
            className={
              isResearching
                ? "ops-collector__headline ops-collector__headline--active"
                : "ops-collector__headline"
            }
          >
            {view.statusHeadline}
          </p>
          {view.artist ? (
            <>
              <h1 className="ops-collector__artist">{view.artist}</h1>
              {view.title ? <p className="ops-collector__title">{view.title}</p> : null}
            </>
          ) : (
            <h1 className="ops-collector__artist">{rvtr}</h1>
          )}
          <p className="ops-collector__activity">{view.activityLine}</p>
        </div>
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-knowledge">
        <h2 id="collector-knowledge" className="ops-collector__panel-title">
          Knowledge Level
        </h2>
        <div className="ops-collector__knowledge">
          <p className="ops-collector__knowledge-tier">{view.knowledgeTier}</p>
          <p className="ops-collector__knowledge-bar" aria-hidden>
            {view.knowledgeBar}
          </p>
        </div>
        {view.stillLookingFor.length > 0 ? (
          <div className="ops-collector__still-looking">
            <p className="ops-collector__still-label">Still looking for</p>
            <ul className="ops-collector__list">
              {view.stillLookingFor.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="ops-collector__empty-copy">
            No major gaps on the desk — the file looks well covered.
          </p>
        )}
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-handoff">
        <h2 id="collector-handoff" className="ops-collector__panel-title">
          {view.handoff.title}
        </h2>
        <ul className="ops-collector__handoff-list">
          {(view.handoff.items ?? []).map((item) => (
            <li key={item.id} className="ops-collector__handoff-item">
              <span
                className={`ops-collector__handoff-status ${handoffStatusClass(item.status)}`}
              >
                {handoffStatusSymbol(item.status)} {item.label}
              </span>
              <span className="ops-collector__handoff-label">{item.status}</span>
            </li>
          ))}
        </ul>
        <p className="ops-collector__handoff-cta">
          <Link className="ops-editor-lib__card-cta" href={`/ops/studio/editor/${rvtr}`}>
            Open in Editor →
          </Link>
        </p>
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-discoveries">
        <h2 id="collector-discoveries" className="ops-collector__panel-title">
          Discoveries
        </h2>
        {view.discoveries.length > 0 ? (
          <ul className="ops-collector__discoveries">
            {view.discoveries.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        ) : (
          <p className="ops-collector__empty-copy">
            {isResearching
              ? "Discoveries will appear as the investigation unfolds."
              : "No discoveries recorded yet."}
          </p>
        )}
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-package">
        <h2 id="collector-package" className="ops-collector__panel-title">
          Research Package
        </h2>
        <div className="ops-collector__package-grid">
          {view.packageCards.map((card) => (
            <article key={card.label} className="ops-collector__package-card">
              <h3>{card.label}</h3>
              <p className={`ops-collector__card-status ${cardStatusClass(card.status)}`}>
                {card.status}
              </p>
            </article>
          ))}
        </div>
      </section>

      {(view.performances ?? []).length > 0 ? (
        <section className="ops-collector__panel" aria-labelledby="collector-performance">
          <h2 id="collector-performance" className="ops-collector__panel-title">
            Performance
          </h2>
          <fieldset className="ops-collector__performance-selector">
            <legend className="ops-collector__performance-legend">Available performances</legend>
            {(view.performances ?? []).map((performance) => (
              <label key={performance.id} className="ops-collector__performance-option">
                <input
                  type="radio"
                  name="collector-performance"
                  value={performance.id}
                  checked={selectedPerformanceId === performance.id}
                  onChange={() => selectPerformance(performance.id)}
                />
                <span>{performance.title}</span>
              </label>
            ))}
          </fieldset>
          {activePerformance ? (
            <dl className="ops-collector__performance-meta">
              {activePerformance.detectedVenue ? (
                <div>
                  <dt>Venue</dt>
                  <dd>{activePerformance.detectedVenue}</dd>
                </div>
              ) : null}
              {activePerformance.detectedYear != null ? (
                <div>
                  <dt>Year</dt>
                  <dd>{activePerformance.detectedYear}</dd>
                </div>
              ) : null}
              <div>
                <dt>Confidence</dt>
                <dd>{Math.round(activePerformance.confidence * 100)}%</dd>
              </div>
            </dl>
          ) : null}
        </section>
      ) : null}

      {(view.performanceFacts ?? []).length > 0 ? (
        <section className="ops-collector__panel" aria-labelledby="collector-performance-facts">
          <h2 id="collector-performance-facts" className="ops-collector__panel-title">
            Performance Facts
          </h2>
          <ul className="ops-collector__discoveries">
            {(view.performanceFacts ?? []).map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ops-collector__panel" aria-labelledby="collector-visual-assets">
        <h2 id="collector-visual-assets" className="ops-collector__panel-title">
          Visual Assets
        </h2>
        <p className="ops-collector__visual-lead">{view.visualAssetsMessage}</p>
        <div className="ops-collector__visual-grid">
          {view.visualAssets.map((slot) => (
            <article
              key={slot.label}
              className={
                slot.status === "ready"
                  ? "ops-collector__visual-slot ops-collector__visual-slot--ready"
                  : "ops-collector__visual-slot"
              }
            >
              {slot.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slot.imageUrl} alt="" className="ops-collector__visual-image" />
              ) : (
                <div className="ops-collector__visual-placeholder" aria-hidden>
                  ◫
                </div>
              )}
              <h3>{slot.label}</h3>
              <p>{slot.status === "ready" ? "Ready" : "Waiting…"}</p>
            </article>
          ))}
        </div>
        {crowdAssets.length > 0 ? (
          <div className="ops-collector__visual-extra">
            {crowdAssets.map((asset) => (
              <article key={asset.id} className="ops-collector__visual-slot ops-collector__visual-slot--ready">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/ops/studio/collector/visual-asset?rvtr=${encodeURIComponent(rvtr)}&file=${encodeURIComponent(asset.filename)}`}
                  alt=""
                  className="ops-collector__visual-image"
                />
                <h3>Crowd</h3>
                <p>Ready</p>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-recent">
        <h2 id="collector-recent" className="ops-collector__panel-title">
          Recent Discoveries
        </h2>
        {view.recentDiscoveries.length > 0 ? (
          <ol className="ops-collector__recent">
            {view.recentDiscoveries.map((entry) => (
              <li key={`${entry.at}-${entry.message}`}>
                <time dateTime={entry.at}>{entry.time}</time>
                <span>{entry.message}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="ops-collector__empty-copy">Waiting for the next lead…</p>
        )}
      </section>

      <section className="ops-collector__panel ops-collector__panel--notes" aria-labelledby="collector-notes">
        <h2 id="collector-notes" className="ops-collector__panel-title">
          Collector Notes
        </h2>
        <div className="ops-collector__notes">
          {(view.collectorNotes ?? "").split("\n\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>

      <section className="ops-collector__panel" aria-labelledby="collector-future">
        <h2 id="collector-future" className="ops-collector__panel-title">
          Future Analysis
        </h2>
        <div className="ops-collector__future-grid">
          {FUTURE_ANALYSIS_HOOKS.map((label) => (
            <article key={label} className="ops-collector__future-card">
              <span className="ops-collector__future-icon" aria-hidden>
                ◫
              </span>
              <h3>{label}</h3>
              <p>Future department</p>
            </article>
          ))}
        </div>
      </section>

      <nav className="ops-collector__song-nav" aria-label="Song navigation">
        {initialContext.prev ? (
          <Link className="ops-collector__song-nav-link" href={initialContext.prev.href}>
            <span className="ops-collector__song-nav-label">Previous Song</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.prev.artist} — {initialContext.prev.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
        {initialContext.next ? (
          <Link
            className="ops-collector__song-nav-link ops-collector__song-nav-link--next"
            href={initialContext.next.href}
          >
            <span className="ops-collector__song-nav-label">Next Song</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.next.artist} — {initialContext.next.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
      </nav>
    </div>
  );
}
