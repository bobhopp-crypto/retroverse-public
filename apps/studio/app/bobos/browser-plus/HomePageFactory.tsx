"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { HomePageCanonicalPreflight } from "@/lib/ops/home-page-factory-eligibility";
import {
  FACTORY_GRID_COLUMNS,
  factoryViewModelFor,
  filterFactoryRows,
  homePageJobFor,
  isProductionEligible,
  nextVideoId,
  requiresSkipConfirmation,
  type FactoryAction,
  type FactoryBrowserRow,
  type OperatorStatus,
} from "@/lib/ops/home-page-factory-model";
import type { IssueGenerationMonitorData } from "@/lib/ops/issue-generation-monitor";

import "./home-page-factory.css";

type HeroFrameCandidate = {
  id: string;
  filename: string;
  path: string;
  timestamp: number | null;
  score: number | null;
  selected: boolean;
  previewHref: string;
};

export type { FactoryBrowserRow };

function statusClass(status: OperatorStatus): string {
  if (status === "NEEDS ATTENTION") return "attention";
  if (status === "REVIEW") return "review";
  if (status === "COMPLETE") return "complete";
  return "ready";
}

async function loadFactoryPayload(): Promise<{
  rows: FactoryBrowserRow[];
  issueGeneration: IssueGenerationMonitorData;
}> {
  const response = await fetch("/api/ops/issue-generation/factory-model");
  if (!response.ok) throw new Error("Factory model could not be loaded.");
  return response.json();
}

export function HomePageFactory() {
  const [sourceRows, setSourceRows] = useState<FactoryBrowserRow[]>([]);
  const [issueGeneration, setIssueGeneration] = useState<IssueGenerationMonitorData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<FactoryAction | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedPreflight, setSelectedPreflight] = useState<HomePageCanonicalPreflight | null>(null);
  const [framePickerOpen, setFramePickerOpen] = useState(false);
  const [frameCandidates, setFrameCandidates] = useState<HeroFrameCandidate[]>([]);
  const [framePickerBusy, setFramePickerBusy] = useState(false);

  const refreshFactory = useCallback(async () => {
    const payload = await loadFactoryPayload();
    setSourceRows(payload.rows);
    setIssueGeneration(payload.issueGeneration);
    setPreviewKey((value) => value + 1);
    return payload;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refreshFactory()
      .then((payload) => {
        if (cancelled) return;
        const preferred =
          payload.rows.find((row) => row.rvtr === "RVTR478078") ??
          payload.rows.find((row) => row.rvtr === "RVTR347287") ??
          payload.rows.find((row) => isProductionEligible(row)) ??
          payload.rows[0];
        setSelectedId((current) => current ?? preferred?.id ?? null);
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
  }, [refreshFactory]);

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

  useEffect(() => {
    setFramePickerOpen(false);
    setFrameCandidates([]);
  }, [selected?.rvtr]);

  async function loadFrameCandidates(rvtr: string) {
    const response = await fetch(`/api/ops/issue-generation/hero-frame-candidates?rvtr=${rvtr}`);
    if (!response.ok) throw new Error("Hero frame candidates unavailable.");
    const payload = (await response.json()) as { candidates?: HeroFrameCandidate[] };
    setFrameCandidates(payload.candidates ?? []);
  }

  async function chooseHeroFrame(framePath: string) {
    if (!selected?.rvtr) return;
    setFramePickerBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/ops/issue-generation/hero-frame", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rvtr: selected.rvtr, framePath }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "Hero frame could not be updated.");
      await refreshFactory();
      setFramePickerOpen(false);
      setMessage("HERO FRAME UPDATED · preview refreshed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hero frame update failed.");
    } finally {
      setFramePickerBusy(false);
    }
  }

  async function runAction(action: FactoryAction, options?: { secondary?: boolean }) {
    if (!selected || !view) return;

    if (action === "APPROVE HOMEPAGE") {
      if ((!options?.secondary && !view.actionEnabled) || !selected.rvtr) return;
      setBusyAction(action);
      setMessage("");
      try {
        const response = await fetch("/api/ops/issue-generation/review-intent", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rvtr: selected.rvtr, intent: "approve" }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) throw new Error(result?.error ?? "Approval could not be recorded.");
        await refreshFactory();
        setMessage("APPROVED · not published");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Approval failed.");
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if (action === "OPEN HOMEPAGE") {
      openFullPreview(view.homepage.previewHref);
      return;
    }

    if (action === "CHOOSE DIFFERENT FRAME") {
      if (!selected.rvtr) return;
      setBusyAction(action);
      setMessage("");
      try {
        await loadFrameCandidates(selected.rvtr);
        setFramePickerOpen(true);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Frame list unavailable.");
      } finally {
        setBusyAction(null);
      }
      return;
    }

    setMessage(`${action} is not wired for this item yet.`);
  }

  function openFullPreview(previewHref: string | null | undefined) {
    if (previewHref) {
      window.open(previewHref, "_blank", "noopener,noreferrer");
      return;
    }
    setMessage("Homepage preview is not available yet.");
  }

  function actionButtonLabel(action: FactoryAction): string {
    if (busyAction === action) {
      if (action === "APPROVE HOMEPAGE") return "APPROVING…";
      if (action === "CHOOSE DIFFERENT FRAME") return "LOADING FRAMES…";
      return "WORKING…";
    }
    return action;
  }

  function runNextVideo() {
    if (!view || !rows.length) return;
    if (requiresSkipConfirmation(view.status)) {
      const confirmed = window.confirm(
        `${selected?.title ?? "This video"} is unresolved (${view.status}). Skip to the next video anyway?`,
      );
      if (!confirmed) return;
    }
    setSelectedId(nextVideoId(rows, selectedId));
    setMessage("");
  }

  const sourcePreviewHref =
    view?.sourceVideo.thumbnailHref ?? view?.sourceVideo.posterHref ?? null;

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
          <button
            type="button"
            className="factory-next"
            onClick={runNextVideo}
            disabled={!rows.length}
          >
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
                {selected.year ?? "Year unavailable"} ·{" "}
                {selectedPreflight?.canonical.albumResolved
                  ? selectedPreflight.canonical.albumHref
                    ? "Canonical album linked"
                    : "Album route unavailable"
                  : "Album hidden · no canonical route"} · {selected.playCount ?? 0} plays
              </p>
              <span className={`factory-status factory-status--${statusClass(view.status)}`}>
                {view.status}
              </span>
              <small>{selected.rvtr ?? "No RVTR"}</small>
              <p className="factory-reason">{view.statusReason}</p>
              {view.status === "COMPLETE" ? (
                <p className="factory-artwork-version">HOMEPAGE APPROVED</p>
              ) : view.magazineMode ? (
                <p className="factory-artwork-version">MAGAZINE HOMEPAGE READY</p>
              ) : null}
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
              {view.sourceVideo.available && sourcePreviewHref ? (
                <img src={sourcePreviewHref} alt="Local source video preview" />
              ) : (
                <div className="factory-empty">LOCAL VIDEO UNAVAILABLE</div>
              )}
              {view.sourceVideo.durationSeconds ? (
                <small>{view.sourceVideo.durationSeconds}s</small>
              ) : null}
              {!view.sourceVideo.thumbnailHref && view.sourceVideo.posterHref ? (
                <small>Using first selected frame</small>
              ) : null}
            </div>

            <div className="factory-workspace__frames factory-hero-frame">
              <h4>HERO FRAME</h4>
              {view.heroFrame.previewHref ? (
                <>
                  <img src={view.heroFrame.previewHref} alt="Selected magazine hero frame" />
                  {view.heroFrame.timestamp ? (
                    <small>
                      {view.heroFrame.timestamp.toFixed(2)}s · landscape source frame
                    </small>
                  ) : null}
                  {view.heroFrame.reason ? <small>{view.heroFrame.reason}</small> : null}
                </>
              ) : (
                <div className="factory-empty">NO SELECTED HERO FRAME</div>
              )}
              {framePickerOpen ? (
                <div className="factory-frame-picker" aria-label="Choose hero frame">
                  <strong>CHOOSE DIFFERENT FRAME</strong>
                  <div className="factory-frame-picker__grid">
                    {frameCandidates.map((candidate) => (
                      <button
                        key={candidate.id}
                        type="button"
                        className={`factory-frame-picker__item ${candidate.selected ? "is-current" : ""}`}
                        disabled={framePickerBusy}
                        onClick={() => chooseHeroFrame(candidate.path)}
                      >
                        <img src={candidate.previewHref} alt="" />
                        <small>
                          {candidate.filename}
                          {candidate.timestamp != null ? ` · ${candidate.timestamp.toFixed(2)}s` : ""}
                          {candidate.score != null ? ` · score ${candidate.score.toFixed(1)}` : ""}
                        </small>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="factory-secondary-action"
                    disabled={framePickerBusy}
                    onClick={() => setFramePickerOpen(false)}
                  >
                    CLOSE
                  </button>
                </div>
              ) : null}
            </div>

            <div className="factory-workspace__output">
              <h4>MOBILE HOMEPAGE PREVIEW</h4>
              {view.homepage.available && view.homepage.previewHref ? (
                <>
                  <div className="factory-preview-viewport">
                    <div className="factory-magazine-preview-scaler">
                      <div className="factory-magazine-preview-shell">
                        <iframe
                          key={previewKey}
                          title={`Mobile homepage preview for ${selected.title}`}
                          src={view.homepage.previewHref}
                          className="factory-magazine-preview-shell__iframe"
                          scrolling="no"
                          tabIndex={-1}
                        />
                      </div>
                      <button
                        type="button"
                        className="factory-magazine-preview-scaler__hit"
                        onClick={() => openFullPreview(view.homepage.previewHref)}
                        aria-label="Open full mobile homepage preview in a new tab"
                      />
                    </div>
                  </div>
                  <p className="factory-preview-open-hint">OPEN FULL PREVIEW · click preview</p>
                </>
              ) : (
                <div className="factory-empty factory-preview-viewport">
                  {view.heroFrame.available ? "MAGAZINE PREVIEW UNAVAILABLE" : "SELECT A HERO FRAME TO PREVIEW"}
                </div>
              )}
              <div className="factory-action-bar" aria-label="Homepage production actions">
                <button
                  type="button"
                  className="factory-primary-action"
                  disabled={!view.actionEnabled || busyAction !== null}
                  onClick={() => runAction(view.primaryAction)}
                >
                  {actionButtonLabel(view.primaryAction)}
                </button>
                {view.secondaryAction === "CHOOSE DIFFERENT FRAME" ? (
                  <button
                    type="button"
                    className="factory-secondary-action"
                    disabled={!view.secondaryActionEnabled || busyAction !== null}
                    onClick={() => runAction("CHOOSE DIFFERENT FRAME", { secondary: true })}
                  >
                    {actionButtonLabel("CHOOSE DIFFERENT FRAME")}
                  </button>
                ) : view.secondaryAction && view.secondaryAction !== "NEXT VIDEO" ? (
                  <button
                    type="button"
                    className="factory-secondary-action"
                    disabled={!view.secondaryActionEnabled || busyAction !== null}
                    onClick={() => runAction(view.secondaryAction!, { secondary: true })}
                  >
                    {actionButtonLabel(view.secondaryAction)}
                  </button>
                ) : null}
                {view.homepage.previewHref ? (
                  <button
                    type="button"
                    className="factory-secondary-action factory-secondary-action--preview"
                    disabled={busyAction !== null}
                    onClick={() => openFullPreview(view.homepage.previewHref)}
                  >
                    OPEN FULL PREVIEW
                  </button>
                ) : null}
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
