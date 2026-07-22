"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  buildCategoryHealth,
  downloadReviewReportMarkdown,
} from "@/lib/bobos/rv-registry-workbench/report";
import type {
  CaptureSessionSnapshot,
  ScreenshotCaptureResult,
  WorkbenchCard,
  WorkbenchCatalogResponse,
  WorkbenchDecision,
} from "@/lib/bobos/rv-registry-workbench/types";

import "./rv-registry-workbench.css";

type ViewMode = "grid" | "categories" | "queue";

type CaptureUiState =
  | { status: "idle" }
  | { status: "capturing" }
  | { status: "success" }
  | {
      status: "error";
      message: string;
      route: string | null;
      attemptedUrl: string | null;
      finalUrl: string | null;
      detail: string | null;
      consoleErrors: string[];
      sessionLocked?: boolean;
    };

const DECISIONS: Array<{ key: WorkbenchDecision; label: string; hotkey: string }> = [
  { key: "keep", label: "Keep", hotkey: "K" },
  { key: "rename", label: "Rename", hotkey: "R" },
  { key: "move", label: "Move", hotkey: "M" },
  { key: "retire", label: "Retire", hotkey: "T" },
  { key: "review-later", label: "Review Later", hotkey: "L" },
];

function decisionLabel(decision: WorkbenchDecision | null): string {
  if (!decision) return "Not Reviewed";
  return DECISIONS.find((item) => item.key === decision)?.label ?? decision;
}

function decisionDataAttr(decision: WorkbenchDecision | null): string {
  return decision ?? "none";
}

function idleCapture(): CaptureUiState {
  return { status: "idle" };
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function RvRegistryWorkbench() {
  const [catalog, setCatalog] = useState<WorkbenchCatalogResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [verification, setVerification] = useState("all");
  const [status, setStatus] = useState("all");
  const [decision, setDecision] = useState("all");
  const [viewedFilter, setViewedFilter] = useState("all");
  const [mode, setMode] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [captureById, setCaptureById] = useState<Record<string, CaptureUiState>>({});
  const [detailCaptureId, setDetailCaptureId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [captureSession, setCaptureSession] = useState<CaptureSessionSnapshot | null>(null);
  const [sessionBusy, setSessionBusy] = useState<string | null>(null);
  const [maintenanceNote, setMaintenanceNote] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/bobos/rv-registry-workbench", { cache: "no-store" });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || `Failed to load workbench (${res.status})`);
    }
    const data = (await res.json()) as WorkbenchCatalogResponse;
    setCatalog(data);
    setCaptureSession(data.captureSession);
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    return catalog.cards.filter((card) => {
      if (mode === "queue" && card.review.decision) return false;
      if (category !== "all" && card.category !== category) return false;
      if (verification !== "all" && card.verification !== verification) return false;
      if (status !== "all" && card.status !== status) return false;
      if (mode !== "queue") {
        if (decision === "none") {
          if (card.review.decision) return false;
        } else if (decision !== "all" && card.review.decision !== decision) {
          return false;
        }
      }
      if (viewedFilter === "viewed" && !card.review.viewedAt) return false;
      if (viewedFilter === "not-viewed" && card.review.viewedAt) return false;
      if (!q) return true;
      const blob = `${card.id} ${card.title} ${card.description} ${card.route ?? ""} ${card.category}`.toLowerCase();
      return blob.includes(q);
    });
  }, [catalog, query, category, verification, status, decision, viewedFilter, mode]);

  const selectedIndex = useMemo(
    () => (selectedId ? filtered.findIndex((card) => card.id === selectedId) : -1),
    [filtered, selectedId],
  );
  const selected = useMemo(() => {
    if (!selectedId || !catalog) return null;
    if (selectedIndex >= 0) return filtered[selectedIndex] ?? null;
    return catalog.cards.find((card) => card.id === selectedId) ?? null;
  }, [catalog, filtered, selectedId, selectedIndex]);

  useEffect(() => {
    setNotesDraft(selected?.review.notes ?? "");
    setActionError(null);
  }, [selected?.id, selected?.review.notes]);

  function setCaptureState(rvId: string, state: CaptureUiState) {
    setCaptureById((prev) => ({ ...prev, [rvId]: state }));
  }

  async function saveReview(
    rvId: string,
    patch: { decision?: WorkbenchDecision | null; notes?: string; viewed?: boolean },
  ): Promise<WorkbenchCatalogResponse> {
    setActionError(null);
    const res = await fetch("/api/bobos/rv-registry-workbench", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rvId, ...patch }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "Could not save review");
    }
    return reload();
  }

  async function captureScreenshot(card: WorkbenchCard) {
    if (!card.capturable) {
      setCaptureState(card.id, {
        status: "error",
        message: card.captureBlockReason || "This panel cannot be captured.",
        route: card.route,
        attemptedUrl: null,
        finalUrl: null,
        detail: card.captureBlockReason,
        consoleErrors: [],
      });
      return;
    }

    setCaptureState(card.id, { status: "capturing" });
    try {
      const res = await fetch("/api/bobos/rv-registry-workbench/screenshot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rvId: card.id }),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<ScreenshotCaptureResult> & {
        error?: string;
      };

      if (!res.ok || body.ok === false) {
        setCaptureState(card.id, {
          status: "error",
          message: body.sessionLocked
            ? "Capture session locked"
            : body.error || `Screenshot failed (HTTP ${res.status})`,
          route: card.route,
          attemptedUrl: body.attemptedUrl ?? null,
          finalUrl: body.finalUrl ?? null,
          detail: body.detail ?? body.error ?? null,
          consoleErrors: body.consoleErrors ?? [],
          sessionLocked: Boolean(body.sessionLocked),
        });
        if (body.sessionLocked) {
          void refreshCaptureSession();
        }
        return;
      }

      await reload();
      setCaptureState(card.id, { status: "success" });
      window.setTimeout(() => {
        setCaptureById((prev) => {
          if (prev[card.id]?.status !== "success") return prev;
          return { ...prev, [card.id]: idleCapture() };
        });
      }, 2000);
    } catch (err) {
      setCaptureState(card.id, {
        status: "error",
        message: err instanceof Error ? err.message : "Screenshot capture failed",
        route: card.route,
        attemptedUrl: null,
        finalUrl: null,
        detail: err instanceof Error ? err.message : null,
        consoleErrors: [],
      });
    }
  }

  async function onDecision(key: WorkbenchDecision) {
    if (!selected) return;
    const currentId = selected.id;
    try {
      const data = await saveReview(currentId, { decision: key });
      if (mode === "queue") {
        const next = data.cards.find((card) => !card.review.decision);
        setSelectedId(next?.id ?? null);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save decision");
    }
  }

  function startReviewQueue() {
    setMode("queue");
    setDecision("all");
    setViewedFilter("all");
    if (!catalog) return;
    const next = catalog.cards.find((card) => !card.review.decision);
    setSelectedId(next?.id ?? null);
  }

  async function refreshCaptureSession() {
    const res = await fetch("/api/bobos/rv-registry-workbench/capture-session", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { session?: CaptureSessionSnapshot };
    if (body.session) setCaptureSession(body.session);
  }

  async function runCaptureSessionAction(action: "open" | "test" | "refresh") {
    setSessionBusy(action);
    setMaintenanceNote(null);
    try {
      const res = await fetch("/api/bobos/rv-registry-workbench/capture-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        session?: CaptureSessionSnapshot;
      };
      if (!res.ok) throw new Error(body.error || `Session action failed (${res.status})`);
      if (body.session) setCaptureSession(body.session);
      await reload();
    } catch (err) {
      setMaintenanceNote(err instanceof Error ? err.message : "Capture session action failed");
    } finally {
      setSessionBusy(null);
    }
  }

  async function runScreenshotMaintenance(action: "find-invalid" | "recapture-invalid") {
    setSessionBusy(action);
    setMaintenanceNote(null);
    try {
      const res = await fetch("/api/bobos/rv-registry-workbench/screenshot/maintenance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        scanned?: number;
        invalidIds?: string[];
        keptValid?: number;
        attempted?: string[];
        succeeded?: string[];
        failed?: Array<{ rvId: string; error: string }>;
      };
      if (!res.ok) throw new Error(body.error || `Maintenance failed (${res.status})`);
      if (action === "find-invalid") {
        setMaintenanceNote(
          `Scanned ${body.scanned ?? 0}. Marked invalid: ${(body.invalidIds ?? []).length}. Kept valid: ${body.keptValid ?? 0}.`,
        );
      } else {
        setMaintenanceNote(
          `Recapture attempted ${(body.attempted ?? []).length}. Succeeded ${(body.succeeded ?? []).length}. Failed ${(body.failed ?? []).length}.`,
        );
      }
      await reload();
    } catch (err) {
      setMaintenanceNote(err instanceof Error ? err.message : "Maintenance failed");
    } finally {
      setSessionBusy(null);
    }
  }

  async function onSaveNotes() {
    if (!selected) return;
    setSavingNotes(true);
    try {
      await saveReview(selected.id, { notes: notesDraft });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save notes");
    } finally {
      setSavingNotes(false);
    }
  }

  function onOpenPanel(card: WorkbenchCard) {
    if (!card.openHref) return;
    window.open(card.openHref, "_blank", "noopener,noreferrer");
    if (!card.review.viewedAt) {
      void saveReview(card.id, { viewed: true }).catch((err) => {
        setActionError(err instanceof Error ? err.message : "Could not mark viewed");
      });
    }
  }

  function goRelative(delta: number) {
    if (filtered.length === 0) return;
    if (selectedIndex < 0) {
      setSelectedId(filtered[0]?.id ?? null);
      return;
    }
    const next = selectedIndex + delta;
    if (next < 0 || next >= filtered.length) return;
    setSelectedId(filtered[next]?.id ?? null);
  }

  useEffect(() => {
    if (!selectedId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      if (detailCaptureId) {
        if (event.key === "Escape") {
          event.preventDefault();
          setDetailCaptureId(null);
        }
        return;
      }

      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        goRelative(-1);
        return;
      }
      if (key === "ArrowRight") {
        event.preventDefault();
        goRelative(1);
        return;
      }

      const upper = key.length === 1 ? key.toUpperCase() : key;
      const match = DECISIONS.find((item) => item.hotkey === upper);
      if (match) {
        event.preventDefault();
        void onDecision(match.key);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: bind to current review context
  }, [selectedId, selectedIndex, filtered, detailCaptureId]);

  if (loadError) {
    return (
      <main className="rv-wb">
        <header className="rv-wb__header">
          <p className="rv-wb__eyebrow">Temporary architectural tool</p>
          <h1>RV Registry Workbench</h1>
          <p className="rv-wb__error">{loadError}</p>
        </header>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="rv-wb">
        <p className="rv-wb__loading">Loading light table…</p>
      </main>
    );
  }

  const selectedCapture = selected ? captureById[selected.id] ?? idleCapture() : idleCapture();
  const detailCapture = detailCaptureId ? captureById[detailCaptureId] : null;
  const detailCard = detailCaptureId
    ? catalog.cards.find((card) => card.id === detailCaptureId) ?? null
    : null;
  const categoryHealth = buildCategoryHealth(catalog);
  const progressCategoryId =
    category !== "all" ? category : selected?.category ?? categoryHealth[0]?.id ?? null;
  const progressCategory = categoryHealth.find((row) => row.id === progressCategoryId) ?? null;
  const reviewComplete = catalog.counts.reviewed === catalog.counts.total;

  return (
    <main className="rv-wb">
      <header className="rv-wb__header">
        <p className="rv-wb__eyebrow">Temporary architectural tool · not in Cockpit</p>
        <h1>RV Registry Workbench</h1>
        <p className="rv-wb__lede">
          Light table for every registered BobOS application. Photograph screenshots, open panels,
          and record decisions locally — the registry itself is never modified.
        </p>
      </header>

      <div className="rv-wb__layout">
        <aside className="rv-wb__sidebar" aria-label="Review summary">
          <section className="rv-wb__side-block">
            <h2>Summary</h2>
            <dl className="rv-wb__side-stats">
              <div><dt>Total applications</dt><dd>{catalog.counts.total}</dd></div>
              <div><dt>Reviewed</dt><dd>{catalog.counts.reviewed}</dd></div>
              <div><dt>Not reviewed</dt><dd>{catalog.counts.byDecision.none}</dd></div>
              <div><dt>Keep</dt><dd>{catalog.counts.byDecision.keep}</dd></div>
              <div><dt>Rename</dt><dd>{catalog.counts.byDecision.rename}</dd></div>
              <div><dt>Move</dt><dd>{catalog.counts.byDecision.move}</dd></div>
              <div><dt>Retire</dt><dd>{catalog.counts.byDecision.retire}</dd></div>
              <div><dt>Review Later</dt><dd>{catalog.counts.byDecision["review-later"]}</dd></div>
              <div><dt>Viewed</dt><dd>{catalog.counts.viewed}</dd></div>
              <div><dt>Not Viewed</dt><dd>{catalog.counts.total - catalog.counts.viewed}</dd></div>
            </dl>
          </section>

          <section className="rv-wb__side-block">
            <h2>Capture session</h2>
            <p className="rv-wb__progress">
              Status:{" "}
              <strong data-session={captureSession?.status ?? "unknown"}>
                {(captureSession?.status ?? "unknown").toUpperCase()}
              </strong>
            </p>
            <p className="rv-wb__progress">
              {captureSession?.headedOpen ? "Capture browser open" : "Capture browser closed"}
            </p>
            {captureSession?.lastMessage ? (
              <p className="rv-wb__progress">{captureSession.lastMessage}</p>
            ) : null}
            <div className="rv-wb__side-actions">
              <button
                type="button"
                className="rv-wb__btn"
                disabled={Boolean(sessionBusy)}
                onClick={() => void runCaptureSessionAction("open")}
              >
                {sessionBusy === "open" ? "Opening…" : "Open Capture Browser"}
              </button>
              <button
                type="button"
                className="rv-wb__btn"
                disabled={Boolean(sessionBusy)}
                onClick={() => void runCaptureSessionAction("test")}
              >
                {sessionBusy === "test" ? "Testing…" : "Test Capture Session"}
              </button>
              <button
                type="button"
                className="rv-wb__btn rv-wb__btn--ghost"
                disabled={Boolean(sessionBusy)}
                onClick={() => void runScreenshotMaintenance("find-invalid")}
              >
                {sessionBusy === "find-invalid" ? "Scanning…" : "Find Invalid Screenshots"}
              </button>
              <button
                type="button"
                className="rv-wb__btn rv-wb__btn--ghost"
                disabled={Boolean(sessionBusy)}
                onClick={() => void runScreenshotMaintenance("recapture-invalid")}
              >
                {sessionBusy === "recapture-invalid" ? "Recapturing…" : "Recapture Invalid"}
              </button>
            </div>
            {maintenanceNote ? <p className="rv-wb__progress">{maintenanceNote}</p> : null}
          </section>

          <section className="rv-wb__side-block">
            <h2>Progress</h2>
            <p className="rv-wb__progress">
              Overall: <strong>{catalog.counts.reviewed} / {catalog.counts.total}</strong> reviewed
            </p>
            {progressCategory ? (
              <p className="rv-wb__progress">
                Current category: <strong>{progressCategory.id}</strong>
                <br />
                {progressCategory.reviewed} / {progressCategory.total} reviewed
              </p>
            ) : null}
            {reviewComplete ? (
              <button
                type="button"
                className="rv-wb__btn rv-wb__btn--primary"
                onClick={() => downloadReviewReportMarkdown(catalog)}
              >
                Export Markdown Report
              </button>
            ) : (
              <button type="button" className="rv-wb__btn" onClick={startReviewQueue}>
                Start Review Queue
              </button>
            )}
          </section>

          <section className="rv-wb__side-block">
            <h2>Category health</h2>
            <ul className="rv-wb__cat-health">
              {categoryHealth.map((row) => (
                <li key={row.id}>
                  <strong>{row.id}</strong>
                  <span>
                    {row.total} panels · {row.reviewed} reviewed · {row.keep} keep · {row.retire}{" "}
                    retire · {row.unreviewed} unreviewed
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <div className="rv-wb__main">
      <div className="rv-wb__toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ID, name, route, description…"
          aria-label="Search"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="all">All categories</option>
          {catalog.categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.id} · {item.title}
            </option>
          ))}
        </select>
        <select
          value={verification}
          onChange={(e) => setVerification(e.target.value)}
          aria-label="Verification"
        >
          <option value="all">All verification</option>
          <option value="verified">Verified</option>
          <option value="not-verified">Not Verified</option>
          <option value="n/a">N/A</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">All statuses</option>
          {["Active", "Experimental", "Hidden", "Deprecated", "Retired"].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          aria-label="Decision"
          disabled={mode === "queue"}
        >
          <option value="all">All decisions</option>
          <option value="none">Not Reviewed</option>
          {DECISIONS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={viewedFilter}
          onChange={(e) => setViewedFilter(e.target.value)}
          aria-label="Viewed"
        >
          <option value="all">All viewed state</option>
          <option value="viewed">Viewed</option>
          <option value="not-viewed">Not Viewed</option>
        </select>
        <div className="rv-wb__mode" role="group" aria-label="View mode">
          <button type="button" aria-pressed={mode === "grid"} onClick={() => setMode("grid")}>
            Grid
          </button>
          <button
            type="button"
            aria-pressed={mode === "categories"}
            onClick={() => setMode("categories")}
          >
            Categories
          </button>
          <button type="button" aria-pressed={mode === "queue"} onClick={startReviewQueue}>
            Queue
          </button>
        </div>
      </div>

      <p className="rv-wb__count">
        {mode === "queue"
          ? `Review queue · ${filtered.length} remaining`
          : `Showing ${filtered.length} of ${catalog.counts.total}`}
      </p>

      {reviewComplete ? (
        <div className="rv-wb__complete-banner">
          <strong>Review complete.</strong> Every application has a decision.
          <button type="button" className="rv-wb__btn" onClick={() => downloadReviewReportMarkdown(catalog)}>
            Export Markdown Report
          </button>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="rv-wb__empty">
          {mode === "queue"
            ? "Queue empty — every application has a decision. Export the Markdown report from the sidebar."
            : "No applications match these filters."}
        </p>
      ) : mode === "categories" ? (
        <div className="rv-wb__columns">
          {catalog.categories.map((cat) => {
            const cards = filtered.filter((card) => card.category === cat.id);
            if (category !== "all" && category !== cat.id) return null;
            return (
              <section key={cat.id} className="rv-wb__column" style={{ borderTopColor: cat.accent }}>
                <div className="rv-wb__column-head">
                  <h2 style={{ color: cat.accent }}>{cat.id}</h2>
                  <span>
                    {cat.title} · {cards.length}
                  </span>
                </div>
                <div className="rv-wb__column-stack">
                  {cards.length === 0 ? (
                    <p className="rv-wb__empty">Empty</p>
                  ) : (
                    cards.map((card) => (
                      <WorkbenchCardView
                        key={card.id}
                        card={card}
                        capture={captureById[card.id] ?? idleCapture()}
                        onOpen={() => setSelectedId(card.id)}
                        onOpenPanel={() => onOpenPanel(card)}
                        onCapture={() => void captureScreenshot(card)}
                        onShowCaptureDetail={() => setDetailCaptureId(card.id)}
                        onRetryCapture={() => void captureScreenshot(card)}
                        onOpenCaptureBrowser={() => void runCaptureSessionAction("open")}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rv-wb__grid">
          {filtered.map((card) => (
            <WorkbenchCardView
              key={card.id}
              card={card}
              capture={captureById[card.id] ?? idleCapture()}
              onOpen={() => setSelectedId(card.id)}
              onOpenPanel={() => onOpenPanel(card)}
              onCapture={() => void captureScreenshot(card)}
              onShowCaptureDetail={() => setDetailCaptureId(card.id)}
              onRetryCapture={() => void captureScreenshot(card)}
              onOpenCaptureBrowser={() => void runCaptureSessionAction("open")}
            />
          ))}
        </div>
      )}
        </div>
      </div>

      {selected ? (
        <>
          <button
            type="button"
            className="rv-wb__drawer-backdrop"
            aria-label="Close detail"
            onClick={() => setSelectedId(null)}
          />
          <aside className="rv-wb__drawer" role="dialog" aria-label={`${selected.title} detail`}>
            <div className="rv-wb__drawer-nav">
              <button
                type="button"
                className="rv-wb__btn"
                disabled={selectedIndex <= 0}
                onClick={() => goRelative(-1)}
              >
                ← Previous
              </button>
              <span className="rv-wb__drawer-pos">
                {selectedIndex + 1} / {filtered.length}
              </span>
              <button
                type="button"
                className="rv-wb__btn"
                disabled={selectedIndex >= filtered.length - 1}
                onClick={() => goRelative(1)}
              >
                Next →
              </button>
              <button type="button" className="rv-wb__close" onClick={() => setSelectedId(null)}>
                ×
              </button>
            </div>

            <div className="rv-wb__drawer-top">
              <div>
                <p className="rv-wb__id">{selected.displayId}</p>
                <h2>{selected.title}</h2>
              </div>
            </div>

            <p className="rv-wb__hotkeys">
              ← → navigate · K keep · R rename · M move · T retire · L later · Esc close
            </p>

            <div className="rv-wb__drawer-shot">
              {selectedCapture.status === "capturing" ? (
                <div className="rv-wb__shot-overlay" role="status">
                  Capturing…
                </div>
              ) : null}
              {selected.screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selected.screenshotUrl} alt="" />
              ) : (
                <ThumbnailPlaceholder
                  failed={selectedCapture.status === "error" && !selectedCapture.sessionLocked}
                  sessionLocked={
                    selectedCapture.status === "error" && Boolean(selectedCapture.sessionLocked)
                  }
                />
              )}
            </div>

            <CompactCaptureLine
              capture={selectedCapture}
              route={selected.route}
              onRetry={() => void captureScreenshot(selected)}
              onDetails={() => setDetailCaptureId(selected.id)}
              onOpenCaptureBrowser={() => void runCaptureSessionAction("open")}
            />

            <div className="rv-wb__actions" style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="rv-wb__btn"
                disabled={selectedCapture.status === "capturing"}
                onClick={() => void captureScreenshot(selected)}
              >
                {selectedCapture.status === "capturing"
                  ? "Capturing…"
                  : selected.screenshotExists
                    ? "Recapture Screenshot"
                    : "Capture Screenshot"}
              </button>
              {selected.openHref ? (
                <button
                  type="button"
                  className="rv-wb__btn rv-wb__btn--primary"
                  onClick={() => onOpenPanel(selected)}
                >
                  Open Panel
                </button>
              ) : (
                <button type="button" className="rv-wb__btn" disabled>
                  No openable route
                </button>
              )}
            </div>

            <section className="rv-wb__section">
              <h3>Overview</h3>
              <p>
                <strong>Category:</strong> {selected.category} · {selected.categoryTitle}
              </p>
              <p>
                <strong>Status:</strong> {selected.status}
              </p>
              <p>
                <strong>Verification:</strong> {selected.verificationLabel}
              </p>
              <p>
                <strong>Viewed:</strong>{" "}
                {selected.review.viewedAt
                  ? new Date(selected.review.viewedAt).toLocaleString()
                  : "Not viewed"}
              </p>
              <p>
                <strong>Current route:</strong> <code>{selected.route ?? "—"}</code>
              </p>
            </section>

            <section className="rv-wb__section">
              <h3>Purpose</h3>
              <p>{selected.purpose}</p>
            </section>

            <section className="rv-wb__section">
              <h3>Referenced By</h3>
              {selected.referencedBy.length === 0 ? (
                <p>—</p>
              ) : (
                <ul>
                  {selected.referencedBy.map((item) => (
                    <li key={item.id}>
                      {item.id} · {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rv-wb__section">
              <h3>Panel Documentation</h3>
              {selected.panelDocsHref ? (
                <p>
                  <Link href={selected.panelDocsHref}>Open panel manual</Link>
                </p>
              ) : (
                <p>No typed panel documentation yet.</p>
              )}
            </section>

            <section className="rv-wb__section">
              <h3>Related Panels</h3>
              {selected.relatedPanels.length === 0 ? (
                <p>—</p>
              ) : (
                <ul>
                  {selected.relatedPanels.map((item) => (
                    <li key={item.id}>
                      {item.id} · {item.title}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rv-wb__section">
              <h3>Known Redirects</h3>
              {selected.knownRedirects.length === 0 ? (
                <p>—</p>
              ) : (
                <ul>
                  {selected.knownRedirects.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rv-wb__section">
              <h3>Known Replacements</h3>
              {selected.knownReplacements.length === 0 ? (
                <p>—</p>
              ) : (
                <ul>
                  {selected.knownReplacements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rv-wb__section">
              <h3>Last Modification</h3>
              <p>{selected.lastModification ?? "Not available from panel docs."}</p>
            </section>

            <section className="rv-wb__section">
              <h3>Decision</h3>
              <div className="rv-wb__decisions">
                {DECISIONS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    data-key={item.key}
                    data-active={selected.review.decision === item.key ? "true" : "false"}
                    onClick={() => void onDecision(item.key)}
                  >
                    {item.label}
                    <span className="rv-wb__hotkey-badge">{item.hotkey}</span>
                  </button>
                ))}
              </div>
              {selected.review.decision === "retire" ? (
                <div className="rv-wb__retire-warn" role="status">
                  <strong>Retirement impact (informational only)</strong>
                  <p>No registry changes are made. Referenced by:</p>
                  {selected.retirementImpact.length > 0 ? (
                    <ul>
                      {selected.retirementImpact.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No Cockpit / Navigation / Documentation references detected.</p>
                  )}
                  {selected.referencedBy.length > 0 ? (
                    <>
                      <p>Also mentioned by:</p>
                      <ul>
                        {selected.referencedBy.map((item) => (
                          <li key={item.id}>
                            {item.id} · {item.title}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rv-wb__section">
              <h3>Notes</h3>
              <textarea
                className="rv-wb__notes"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder='e.g. "Replaced by Pass Builder." / "Never used." / "Duplicate of Runtime."'
              />
              <div className="rv-wb__actions" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="rv-wb__btn"
                  disabled={savingNotes || notesDraft === (selected.review.notes ?? "")}
                  onClick={() => void onSaveNotes()}
                >
                  {savingNotes ? "Saving…" : "Save Notes"}
                </button>
              </div>
            </section>

            {actionError ? <p className="rv-wb__error">{actionError}</p> : null}
          </aside>
        </>
      ) : null}

      {detailCapture?.status === "error" && detailCard ? (
        <CaptureDetailDialog
          card={detailCard}
          capture={detailCapture}
          onClose={() => setDetailCaptureId(null)}
          onRetry={() => {
            setDetailCaptureId(null);
            void captureScreenshot(detailCard);
          }}
        />
      ) : null}
    </main>
  );
}

function ThumbnailPlaceholder({
  failed,
  sessionLocked,
}: {
  failed: boolean;
  sessionLocked?: boolean;
}) {
  return (
    <div
      className={`rv-wb__shot-empty${failed || sessionLocked ? " rv-wb__shot-empty--failed" : ""}`}
    >
      {sessionLocked ? (
        <>
          <span className="rv-wb__warn-icon" aria-hidden>
            ⚠
          </span>
          <span>Capture session locked</span>
        </>
      ) : failed ? (
        <>
          <span className="rv-wb__warn-icon" aria-hidden>
            ⚠
          </span>
          <span>Capture failed</span>
        </>
      ) : (
        <span>No valid screenshot</span>
      )}
    </div>
  );
}

function CompactCaptureLine({
  capture,
  route,
  onRetry,
  onDetails,
  onOpenCaptureBrowser,
  reserve = false,
}: {
  capture: CaptureUiState;
  route: string | null;
  onRetry: () => void;
  onDetails: () => void;
  onOpenCaptureBrowser?: () => void;
  /** Keep card height stable when idle. */
  reserve?: boolean;
}) {
  if (capture.status === "idle") {
    return reserve ? <div className="rv-wb__capture-line rv-wb__capture-line--idle" aria-hidden /> : null;
  }

  if (capture.status === "capturing") {
    return (
      <div className="rv-wb__capture-line rv-wb__capture-line--busy" role="status">
        Capturing…
      </div>
    );
  }

  if (capture.status === "success") {
    return (
      <div className="rv-wb__capture-line rv-wb__capture-line--ok" role="status">
        Screenshot saved
      </div>
    );
  }

  if (capture.sessionLocked) {
    return (
      <div className="rv-wb__capture-line rv-wb__capture-line--err" role="alert">
        <div className="rv-wb__capture-line-main">
          <strong>Capture session locked</strong>
          <span>PIN gate detected — thumbnail not saved</span>
          <span>Route: {route ?? "—"}</span>
        </div>
        <div className="rv-wb__capture-line-actions">
          {onOpenCaptureBrowser ? (
            <button type="button" className="rv-wb__linkish" onClick={onOpenCaptureBrowser}>
              Open Capture Browser
            </button>
          ) : null}
          <button type="button" className="rv-wb__linkish" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rv-wb__capture-line rv-wb__capture-line--err" role="alert">
      <div className="rv-wb__capture-line-main">
        <strong>❌ Screenshot failed</strong>
        <span>Reason: {capture.message}</span>
        <span>Route: {route ?? "—"}</span>
      </div>
      <div className="rv-wb__capture-line-actions">
        <button type="button" className="rv-wb__linkish" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="rv-wb__linkish" onClick={onDetails}>
          Details
        </button>
      </div>
    </div>
  );
}

function CaptureDetailDialog({
  card,
  capture,
  onClose,
  onRetry,
}: {
  card: WorkbenchCard;
  capture: Extract<CaptureUiState, { status: "error" }>;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <>
      <button type="button" className="rv-wb__drawer-backdrop" aria-label="Close details" onClick={onClose} />
      <div className="rv-wb__detail-dialog" role="dialog" aria-label="Capture failure details">
        <div className="rv-wb__drawer-top">
          <div>
            <p className="rv-wb__id">{card.displayId}</p>
            <h2>Capture details</h2>
          </div>
          <button type="button" className="rv-wb__close" onClick={onClose}>
            ×
          </button>
        </div>
        <section className="rv-wb__section">
          <h3>Reason</h3>
          <p>{capture.message}</p>
        </section>
        <section className="rv-wb__section">
          <h3>Route</h3>
          <p>
            <code>{capture.route ?? "—"}</code>
          </p>
        </section>
        <section className="rv-wb__section">
          <h3>Playwright URL</h3>
          <p>
            <code>{capture.attemptedUrl ?? "—"}</code>
          </p>
          {capture.finalUrl && capture.finalUrl !== capture.attemptedUrl ? (
            <p>
              Final: <code>{capture.finalUrl}</code>
            </p>
          ) : null}
        </section>
        <section className="rv-wb__section">
          <h3>Detail</h3>
          <pre className="rv-wb__detail-pre">{capture.detail ?? capture.message}</pre>
        </section>
        {capture.consoleErrors.length > 0 ? (
          <section className="rv-wb__section">
            <h3>Console errors</h3>
            <ul>
              {capture.consoleErrors.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="rv-wb__actions">
          <button type="button" className="rv-wb__btn" onClick={onRetry}>
            Retry
          </button>
          <button type="button" className="rv-wb__btn rv-wb__btn--ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}

function WorkbenchCardView({
  card,
  capture,
  onOpen,
  onOpenPanel,
  onCapture,
  onShowCaptureDetail,
  onRetryCapture,
  onOpenCaptureBrowser,
}: {
  card: WorkbenchCard;
  capture: CaptureUiState;
  onOpen: () => void;
  onOpenPanel: () => void;
  onCapture: () => void;
  onShowCaptureDetail: () => void;
  onRetryCapture: () => void;
  onOpenCaptureBrowser: () => void;
}) {
  const capturing = capture.status === "capturing";
  const failed = capture.status === "error" && !capture.sessionLocked;
  const sessionLocked = capture.status === "error" && Boolean(capture.sessionLocked);

  return (
    <article className="rv-wb__card" data-decision={decisionDataAttr(card.review.decision)}>
      <div className="rv-wb__shot">
        {capturing ? (
          <div className="rv-wb__shot-overlay" role="status">
            Capturing…
          </div>
        ) : null}
        {card.screenshotUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.screenshotUrl} alt="" loading="lazy" />
        ) : (
          <ThumbnailPlaceholder failed={failed} sessionLocked={sessionLocked} />
        )}
      </div>
      <div className="rv-wb__meta">
        <p className="rv-wb__id">{card.displayId}</p>
        <h3 className="rv-wb__title">{card.title}</h3>
        <div className="rv-wb__chips">
          <span className="rv-wb__chip">{card.category}</span>
          <span className="rv-wb__chip">{card.status}</span>
          <span className="rv-wb__chip">{card.verificationLabel}</span>
          <span className="rv-wb__chip rv-wb__chip--decision">{decisionLabel(card.review.decision)}</span>
          <span className="rv-wb__chip">{card.review.viewedAt ? "Viewed" : "Not Viewed"}</span>
        </div>
        <p className="rv-wb__route">{card.route ?? "— no route —"}</p>
        <p className="rv-wb__desc">{card.description}</p>
      </div>

      <CompactCaptureLine
        capture={capture}
        route={card.route}
        onRetry={onRetryCapture}
        onDetails={onShowCaptureDetail}
        onOpenCaptureBrowser={onOpenCaptureBrowser}
        reserve
      />

      <div className="rv-wb__actions">
        {card.openHref ? (
          <button type="button" className="rv-wb__btn rv-wb__btn--primary" onClick={onOpenPanel}>
            Open Panel
          </button>
        ) : (
          <button type="button" className="rv-wb__btn rv-wb__btn--primary" disabled>
            Open Panel
          </button>
        )}
        <button type="button" className="rv-wb__btn" onClick={onOpen}>
          Review
        </button>
        <button
          type="button"
          className="rv-wb__btn"
          disabled={capturing}
          onClick={onCapture}
          aria-busy={capturing}
        >
          {capturing ? "Capturing…" : card.screenshotExists ? "Recapture" : "Capture Screenshot"}
        </button>
      </div>
    </article>
  );
}
