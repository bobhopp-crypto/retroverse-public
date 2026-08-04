"use client";

import { useEffect, useMemo, useState } from "react";

import type { HomePageCanonicalPreflight } from "@/lib/ops/home-page-factory-eligibility";
import {
  FACTORY_GRID_COLUMNS,
  factoryViewModelFor,
  filterFactoryRows,
  homePageJobFor,
  isProductionEligible,
  nextVideoId,
  type FactoryAction,
  type FactoryBrowserRow,
  type OperatorStatus,
} from "@/lib/ops/home-page-factory-model";
import type { IssueGenerationMonitorData } from "@/lib/ops/issue-generation-monitor";

import "./home-page-factory.css";

export type { FactoryBrowserRow };

function statusClass(status: OperatorStatus): string {
  if (status === "NEEDS ATTENTION") return "attention";
  if (status === "PREPARING") return "preparing";
  if (status === "REVIEW") return "review";
  if (status === "COMPLETE") return "complete";
  return "ready";
}

export function HomePageFactory() {
  const [sourceRows, setSourceRows] = useState<FactoryBrowserRow[]>([]);
  const [issueGeneration, setIssueGeneration] = useState<IssueGenerationMonitorData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedPreflight, setSelectedPreflight] = useState<HomePageCanonicalPreflight | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/ops/issue-generation/factory-model")
      .then(async (response) => {
        if (!response.ok) throw new Error("Factory model could not be loaded.");
        return response.json() as Promise<{
          rows: FactoryBrowserRow[];
          issueGeneration: IssueGenerationMonitorData;
        }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setSourceRows(payload.rows);
        setIssueGeneration(payload.issueGeneration);
        const preferred =
          payload.rows.find((row) => row.rvtr === "RVTR347287") ??
          payload.rows.find((row) => isProductionEligible(row)) ??
          payload.rows[0];
        setSelectedId(preferred?.id ?? null);
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Factory model could not be loaded.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const jobs = issueGeneration?.jobs ?? [];
  const rows = useMemo(
    () => filterFactoryRows(sourceRows, jobs, search),
    [jobs, search, sourceRows],
  );
  const selectedBase = sourceRows.find((row) => row.id === selectedId) ?? null;
  const selected = selectedBase
    ? { ...selectedBase, canonicalPreflight: selectedPreflight ?? selectedBase.canonicalPreflight }
    : null;
  const selectedJob = selected ? homePageJobFor(jobs, selected) : null;
  const view = selected ? factoryViewModelFor(selected, selectedJob) : null;

  useEffect(() => {
    if (!selectedBase?.rvtr || !selectedBase.fileExists) {
      setSelectedPreflight(selectedBase?.canonicalPreflight ?? null);
      return;
    }
    let cancelled = false;
    const params = new URLSearchParams({
      rvtr: selectedBase.rvtr,
      fileExists: selectedBase.fileExists ? "1" : "0",
      isVideo: selectedBase.isVideo ? "1" : "0",
      playCount: String(selectedBase.playCount ?? 0),
    });
    fetch(`/api/ops/issue-generation/preflight?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((result: HomePageCanonicalPreflight | null) => {
        if (!cancelled && result) setSelectedPreflight(result);
      })
      .catch(() => {
        if (!cancelled) setSelectedPreflight(selectedBase.canonicalPreflight ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBase]);

  async function runAction(action: FactoryAction) {
    if (!selected || !view) return;

    if (action === "NEXT VIDEO") {
      setSelectedId(nextVideoId(rows, selectedId));
      setMessage("");
      return;
    }

    if (action === "OPEN HOMEPAGE") {
      if (view.homepage.previewHref) {
        window.open(view.homepage.previewHref, "_blank", "noopener,noreferrer");
      } else {
        setMessage("Homepage preview is not available yet.");
      }
      return;
    }

    if (action === "APPROVE HOMEPAGE") {
      if (!view.actionEnabled || !selected.rvtr) return;
      setBusy(true);
      setMessage("");
      try {
        const response = await fetch("/api/ops/issue-generation/review-intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rvtr: selected.rvtr, intent: "approve" }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(result?.error ?? "Approval could not be recorded.");
        setMessage("APPROVED · not published · reload to refresh status");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Approval failed.");
      } finally {
        setBusy(false);
      }
      return;
    }

    setMessage(`${action} is not wired in Phase 1.`);
  }

  return (
    <main className="factory-page" style={{ "--factory-grid-columns": FACTORY_GRID_COLUMNS } as React.CSSProperties}>
      <header className="factory-command-bar">
        <div>
          <p className="factory-kicker">RV03-05 · HOME PAGE FACTORY</p>
          <h1>One video at a time</h1>
        </div>
        <div className="factory-command-bar__controls">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search artist, title, or album"
            aria-label="Search artist, title, or album"
          />
          <button type="button" className="factory-next" onClick={() => runAction("NEXT VIDEO")} disabled={!rows.length}>
            NEXT VIDEO
          </button>
        </div>
        {message ? (
          <p className="factory-queue-message" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
        {loadError ? (
          <p className="factory-queue-message" role="alert">
            {loadError}
          </p>
        ) : null}
      </header>

      <section className="factory-workspace" aria-label="Selected video workspace">
        {loading ? (
          <div className="factory-workspace__empty">
            <strong>LOADING VIRTUALDJ VIDEOS…</strong>
            <span>Reading the local library and existing production evidence.</span>
          </div>
        ) : selected && view ? (
          <>
            <div className="factory-workspace__identity">
              <p className="factory-kicker">SELECTED VIDEO</p>
              <h2>{selected.title}</h2>
              <h3>{selected.artist}</h3>
              <p>
                {selected.year ?? "Year unavailable"} · {selected.album || "Album unavailable"} ·{" "}
                {selected.playCount ?? 0} plays
              </p>
              <span className={`factory-status factory-status--${statusClass(view.status)}`}>
                {view.status}
              </span>
              <small>{selected.rvtr ?? "No RVTR"}</small>
              <p className="factory-reason">{view.statusReason}</p>
              {view.eligibility.warnings.length ? (
                <ul className="factory-warnings">
                  {view.eligibility.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
              <p className="factory-eligibility">
                Production: {view.eligibility.productionEligible ? "eligible" : "blocked"} · Public
                homepage: {view.eligibility.publicReady ? "ready" : "not ready"}
              </p>
            </div>

            <div className="factory-workspace__source">
              <h4>SOURCE VIDEO</h4>
              {view.sourceVideo.available && selected.thumbnailUrl ? (
                <img src={selected.thumbnailUrl} alt="Local source video thumbnail" />
              ) : (
                <div className="factory-empty">LOCAL VIDEO UNAVAILABLE</div>
              )}
              {view.sourceVideo.durationSeconds ? (
                <small>{view.sourceVideo.durationSeconds}s</small>
              ) : null}
            </div>

            <div className="factory-workspace__frames">
              <h4>CONTACT SHEET</h4>
              {view.frameEvidence.contactSheetHref ? (
                <img src={view.frameEvidence.contactSheetHref} alt="Selected source-frame contact sheet" />
              ) : (
                <div className="factory-empty">
                  {view.frameEvidence.state === "pending"
                    ? "PREPARING FRAMES…"
                    : view.frameEvidence.state === "failed"
                      ? "FRAME EXTRACTION FAILED"
                      : "FRAMES NOT AVAILABLE"}
                </div>
              )}
              {view.frameEvidence.frameCount ? (
                <small>{view.frameEvidence.frameCount} frames selected</small>
              ) : null}
            </div>

            <div className="factory-workspace__output">
              <h4>ARTWORK / HOMEPAGE</h4>
              {view.artwork.previewHref ? (
                <img src={view.artwork.previewHref} alt="Locally generated homepage artwork" />
              ) : (
                <div className="factory-empty">
                  {view.status === "REVIEW"
                    ? "ARTWORK REVIEW"
                    : view.status === "PREPARING"
                      ? "PREPARING…"
                      : "NO ARTWORK YET"}
                </div>
              )}
              <div className="factory-homepage-slot">
                {view.homepage.available && view.homepage.previewHref ? (
                  <a href={view.homepage.previewHref}>Homepage preview available</a>
                ) : (
                  <span>Homepage preview unavailable</span>
                )}
                {view.homepage.approved ? <em> · Approved</em> : null}
              </div>
              <div className="factory-actions">
                <button
                  type="button"
                  disabled={!view.actionEnabled || busy}
                  onClick={() => runAction(view.primaryAction)}
                >
                  {busy ? "WORKING…" : view.primaryAction}
                </button>
                <small>{view.actionHint}</small>
              </div>
            </div>
          </>
        ) : (
          <div className="factory-workspace__empty">
            <strong>SELECT A VIDEO</strong>
            <span>Choose a VirtualDJ video below to inspect homepage production state.</span>
          </div>
        )}
      </section>

      <section className="factory-browser" aria-label="VirtualDJ video browser">
        <div className="factory-grid factory-browser__head">
          <span>Select</span>
          <span>Video</span>
          <span>Track</span>
          <span>Year / Album</span>
          <span>Plays</span>
          <span>Status</span>
        </div>
        <div className="factory-browser__body">
          {rows.map((row) => {
            const rowView = factoryViewModelFor(row, homePageJobFor(jobs, row));
            return (
              <div
                key={row.id}
                className={`factory-grid factory-row ${selectedId === row.id ? "is-selected" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedId(row.id);
                }}
              >
                <span className="factory-row__select" aria-hidden="true">
                  {selectedId === row.id ? "●" : "○"}
                </span>
                <span className="factory-row__video">
                  {row.thumbnailUrl ? <img src={row.thumbnailUrl} alt="" /> : <span>VIDEO</span>}
                </span>
                <span>
                  <b>{row.artist}</b>
                  <small>{row.title}</small>
                </span>
                <span>
                  {row.year ?? "—"} · {row.album || "Album not verified"}
                </span>
                <span>{row.playCount ?? 0}</span>
                <span className={`factory-status factory-status--${statusClass(rowView.status)}`}>
                  {rowView.status}
                </span>
              </div>
            );
          })}
          {!loading && !rows.length ? (
            <div className="factory-browser__empty">NO MATCHING VIDEOS</div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
