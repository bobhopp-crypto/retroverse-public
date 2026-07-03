"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BrowserPlusMatchBand } from "@/lib/ops/browser-plus/match-queue-types";
import type { BrowserPlusQueueItem } from "@/lib/ops/browser-plus/match-queue-types";
import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

type Props = {
  unmatchedRows: BrowserPlusRow[];
  onReload: () => Promise<void>;
  onExitQueue?: () => void;
};

type QueueTab = BrowserPlusMatchBand;

const BATCH_SIZE = 35;
const TAB_LABEL: Record<QueueTab, string> = {
  auto: "Auto-Match Ready",
  review: "Needs Review",
  search: "Search",
};

function queueKey(row: BrowserPlusRow): string {
  return row.filePath;
}

export function BrowserPlusMatchQueue({ unmatchedRows, onReload, onExitQueue }: Props) {
  const [scored, setScored] = useState<Map<string, BrowserPlusQueueItem>>(new Map());
  const [scoring, setScoring] = useState(false);
  const [scoreProgress, setScoreProgress] = useState({ done: 0, total: 0 });
  const [tab, setTab] = useState<QueueTab>("auto");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [manualHits, setManualHits] = useState<
    Array<{ rvtr: string; title: string; artistName: string }>
  >([]);

  const runBatchScore = useCallback(async () => {
    const todo = unmatchedRows.filter((row) => !scored.has(queueKey(row)));
    if (todo.length === 0) return;

    setScoring(true);
    setError(null);
    setScoreProgress({ done: 0, total: todo.length });

    try {
      for (let offset = 0; offset < todo.length; offset += BATCH_SIZE) {
        const chunk = todo.slice(offset, offset + BATCH_SIZE);
        const res = await fetch("/api/ops/browser-plus/match-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: chunk.map((row) => ({
              rowId: row.id,
              filePath: row.filePath,
              artist: row.artist,
              title: row.title,
            })),
          }),
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          throw new Error(body.error ?? "Batch scoring failed");
        }
        setScored((prev) => {
          const next = new Map(prev);
          for (const item of body.items as BrowserPlusQueueItem[]) {
            next.set(item.filePath, item);
          }
          return next;
        });
        setScoreProgress({ done: Math.min(offset + chunk.length, todo.length), total: todo.length });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setScoring(false);
    }
  }, [unmatchedRows, scored]);

  useEffect(() => {
    void runBatchScore();
  }, [unmatchedRows.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const queueItems = useMemo(() => {
    return unmatchedRows
      .map((row) => scored.get(queueKey(row)))
      .filter((item): item is BrowserPlusQueueItem => item != null);
  }, [unmatchedRows, scored]);

  const byBand = useMemo(() => {
    const auto: BrowserPlusQueueItem[] = [];
    const review: BrowserPlusQueueItem[] = [];
    const search: BrowserPlusQueueItem[] = [];
    for (const item of queueItems) {
      if (item.band === "auto") auto.push(item);
      else if (item.band === "review") review.push(item);
      else search.push(item);
    }
    auto.sort((a, b) => b.combinedScore - a.combinedScore);
    review.sort((a, b) => b.combinedScore - a.combinedScore);
    return { auto, review, search };
  }, [queueItems]);

  const activeList = byBand[tab];

  const assignOne = async (filePath: string, rvtr: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/browser-plus/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, rvtr }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? body.result?.message ?? "Match failed");
      }
      setScored((prev) => {
        const next = new Map(prev);
        next.delete(filePath);
        return next;
      });
      setMessage(`Matched ${rvtr}`);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Match failed");
    } finally {
      setBusy(false);
    }
  };

  const approveAllAuto = async () => {
    const items = byBand.auto.filter((item) => item.top?.rvtr);
    if (items.length === 0) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/browser-plus/assign-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            filePath: item.filePath,
            rvtr: item.top!.rvtr,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Bulk approve failed");
      }
      const ok = body.result?.ok ?? 0;
      setScored((prev) => {
        const next = new Map(prev);
        for (const item of items) next.delete(item.filePath);
        return next;
      });
      setMessage(`Approved ${ok} auto-match${ok === 1 ? "" : "es"}`);
      await onReload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk approve failed");
    } finally {
      setBusy(false);
    }
  };

  const searchItems = byBand.search;
  const currentSearch = searchItems[searchIndex] ?? null;

  useEffect(() => {
    if (tab !== "search" || !currentSearch) {
      setManualHits([]);
      return;
    }
    const q = searchQuery.trim() || `${currentSearch.artist} ${currentSearch.title}`;
    if (q.length < 2) return;

    const handle = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(`/api/ops/sunday-nights/match?q=${encodeURIComponent(q)}`, {
          cache: "no-store",
        });
        const body = await res.json();
        setManualHits(
          (body.manualCandidates ?? []).slice(0, 6).map((c: { rvtr: string; title: string; artistName: string }) => ({
            rvtr: c.rvtr,
            title: c.title,
            artistName: c.artistName,
          })),
        );
      })();
    }, 200);
    return () => window.clearTimeout(handle);
  }, [tab, currentSearch, searchQuery]);

  return (
    <section className="browser-plus-queue" aria-label="Match queue">
      <header className="browser-plus-queue__head">
        <div>
          <p className="browser-plus-queue__kicker">Unmatched queue</p>
          <h2>{unmatchedRows.length.toLocaleString()} videos to match</h2>
        </div>
        <div className="browser-plus-queue__head-actions">
          {onExitQueue ? (
            <button type="button" className="browser-plus-queue__ghost" onClick={onExitQueue}>
              Grid view
            </button>
          ) : null}
          <button
            type="button"
            className="browser-plus-queue__ghost"
            disabled={scoring}
            onClick={() => void runBatchScore()}
          >
            {scoring ? `Scoring ${scoreProgress.done}/${scoreProgress.total}` : "Rescore"}
          </button>
        </div>
      </header>

      {message ? <p className="browser-plus-queue__message">{message}</p> : null}
      {error ? <p className="browser-plus-queue__error">{error}</p> : null}

      <div className="browser-plus-queue__tabs" role="tablist">
        {(["auto", "review", "search"] as QueueTab[]).map((band) => (
          <button
            key={band}
            type="button"
            role="tab"
            aria-selected={tab === band}
            className={tab === band ? "browser-plus-queue__tab browser-plus-queue__tab--active" : "browser-plus-queue__tab"}
            onClick={() => setTab(band)}
          >
            {TAB_LABEL[band]} ({byBand[band].length})
          </button>
        ))}
      </div>

      {tab === "auto" ? (
        <div className="browser-plus-queue__bulk">
          <button
            type="button"
            className="browser-plus-queue__approve-all"
            disabled={busy || byBand.auto.length === 0}
            onClick={() => void approveAllAuto()}
          >
            Approve All ({byBand.auto.length})
          </button>
          <p className="browser-plus-queue__hint">Exact / high-confidence only. One XML write per batch.</p>
        </div>
      ) : null}

      {tab === "search" && currentSearch ? (
        <div className="browser-plus-queue__search-bar">
          <p className="browser-plus-queue__search-focus">
            {currentSearch.artist} · {currentSearch.title}
          </p>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Retroverse…"
            className="browser-plus-queue__search-input"
          />
          <div className="browser-plus-queue__search-nav">
            <button
              type="button"
              disabled={searchIndex <= 0}
              onClick={() => setSearchIndex((i) => Math.max(0, i - 1))}
            >
              Prev
            </button>
            <span>
              {searchIndex + 1} / {searchItems.length}
            </span>
            <button
              type="button"
              disabled={searchIndex >= searchItems.length - 1}
              onClick={() => setSearchIndex((i) => Math.min(searchItems.length - 1, i + 1))}
            >
              Next
            </button>
          </div>
          <div className="browser-plus-queue__search-hits">
            {manualHits.map((hit) => (
              <button
                key={hit.rvtr}
                type="button"
                className="browser-plus-queue__chip"
                disabled={busy}
                onClick={() => void assignOne(currentSearch.filePath, hit.rvtr)}
              >
                {hit.title} · {hit.rvtr}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="browser-plus-queue__list">
        {tab !== "search"
          ? activeList.map((item) => (
              <li key={item.filePath} className={`browser-plus-queue__card browser-plus-queue__card--${item.band}`}>
                <div className="browser-plus-queue__vdj">
                  <strong>{item.title || "—"}</strong>
                  <span>{item.artist || "Unknown artist"}</span>
                </div>
                <div className="browser-plus-queue__arrow" aria-hidden>
                  →
                </div>
                <div className="browser-plus-queue__target">
                  {item.top ? (
                    <>
                      <strong>{item.top.title}</strong>
                      <span>
                        {item.top.rvtr} · {item.combinedScore}%
                      </span>
                    </>
                  ) : (
                    <span className="browser-plus-queue__none">No candidate</span>
                  )}
                </div>
                <div className="browser-plus-queue__actions">
                  {item.top ? (
                    <button
                      type="button"
                      className="browser-plus-queue__match"
                      disabled={busy}
                      onClick={() => void assignOne(item.filePath, item.top!.rvtr)}
                    >
                      Match
                    </button>
                  ) : null}
                  {tab === "review" && item.alternatives.length > 1
                    ? item.alternatives.slice(1, 3).map((alt) => (
                        <button
                          key={alt.rvtr}
                          type="button"
                          className="browser-plus-queue__alt"
                          disabled={busy}
                          onClick={() => void assignOne(item.filePath, alt.rvtr)}
                        >
                          {alt.title.slice(0, 28)}
                        </button>
                      ))
                    : null}
                </div>
              </li>
            ))
          : null}
        {tab !== "search" && activeList.length === 0 ? (
          <li className="browser-plus-queue__empty">
            {scoring ? "Scoring unmatched videos…" : "Nothing in this queue."}
          </li>
        ) : null}
      </ul>
    </section>
  );
}
