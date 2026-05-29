"use client";

import { useEffect, useState } from "react";

import { OpsPill } from "@/components/ops/OpsTable";
import type { VdjCandidate } from "@/lib/ops/load-vdj-candidates";
import type { VdjLibraryHit } from "@/lib/ops/vdj-search-types";
import { VDJ_SEARCH_MIN_QUERY_LEN } from "@/lib/ops/vdj-search-constants";
import type { OpsMatchOverride } from "@/lib/ops/ops-state-store";
import type { YearMatchRow } from "@/lib/ops/types";

function matchLabel(c: { artist: string; title: string }): string {
  return `${c.artist} · ${c.title}`;
}

export function OpsReviewModal(props: {
  row: YearMatchRow;
  onClose: () => void;
  onSaved: (
    override: OpsMatchOverride,
    action: "approve" | "reject" | "select" | "ignore",
    meta?: { vdjYear?: number | null },
  ) => void;
}) {
  const { row, onClose, onSaved } = props;
  const [candidates, setCandidates] = useState<VdjCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(row.mediaId);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VdjLibraryHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    const q = new URLSearchParams({
      graphTrackId: String(row.graphTrackId),
      artist: row.artist,
      title: row.title,
    });
    fetch(`/api/ops/candidates?${q}`)
      .then((res) => res.json())
      .then((data: { ok?: boolean; candidates?: VdjCandidate[] }) => {
        if (cancelled) return;
        if (!data.ok) {
          setErr("Failed to load candidates");
          return;
        }
        setCandidates(data.candidates || []);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load candidates");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row.graphTrackId, row.artist, row.title]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < VDJ_SEARCH_MIN_QUERY_LEN) {
      setSearchResults([]);
      setSearchErr(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    setSearchLoading(true);
    setSearchErr(null);

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q });
      fetch(`/api/ops/vdj-search?${params}`)
        .then((res) => res.json())
        .then(
          (data: { ok?: boolean; results?: VdjLibraryHit[]; error?: string }) => {
            if (cancelled) return;
            if (!data.ok) {
              setSearchErr(data.error || "Search failed");
              setSearchResults([]);
              return;
            }
            setSearchResults(data.results || []);
          },
        )
        .catch(() => {
          if (!cancelled) {
            setSearchErr("Search failed");
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  async function postMatch(
    action: "approve" | "reject" | "select" | "ignore",
    mediaId: number | null,
    bestMatch: string | null,
    vdjYear?: number | null,
  ) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ops/match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chartItemId: row.chartItemId,
          graphTrackId: row.graphTrackId,
          action,
          mediaId,
          bestMatch,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; override?: OpsMatchOverride };
      if (!data.ok || !data.override) {
        setErr("Save failed");
        setBusy(false);
        return;
      }
      const fromCandidate =
        mediaId != null ? candidates.find((x) => x.mediaId === mediaId) : undefined;
      onSaved(data.override, action, {
        vdjYear: vdjYear ?? fromCandidate?.vdjYear ?? null,
      });
    } catch {
      setErr("Save failed");
      setBusy(false);
    }
  }

  function approveSelected() {
    const c = candidates.find((x) => x.mediaId === selectedMediaId);
    const label = c ? matchLabel(c) : row.bestMatch;
    void postMatch("approve", selectedMediaId, label, c?.vdjYear);
  }

  function selectAsMatch(hit: VdjLibraryHit) {
    void postMatch("approve", hit.mediaId, matchLabel(hit), hit.vdjYear);
  }

  return (
    <div className="ops-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ops-modal"
        role="dialog"
        aria-labelledby="ops-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ops-modal__header">
          <div>
            <p className="ops-modal__kicker">Review match</p>
            <h2 id="ops-review-title" className="ops-modal__title">
              {row.artist} — {row.title}
            </h2>
            <p className="ops-modal__meta ops-dim">
              {row.chartSource} · peak #{row.peak ?? "—"} · {row.chartItemId}
              {row.rvtr ? ` · ${row.rvtr}` : ""}
            </p>
            <dl className="ops-modal__years">
              <div>
                <dt>Chart Year</dt>
                <dd>
                  <strong>{row.chartYear}</strong>
                  <span className="ops-dim"> · Billboard universe</span>
                </dd>
              </div>
              {row.releaseYear != null && row.releaseYear !== row.chartYear ? (
                <div>
                  <dt>Release Year</dt>
                  <dd className="ops-dim">{row.releaseYear} · graph metadata</dd>
                </div>
              ) : null}
              {row.vdjYear != null ? (
                <div>
                  <dt>VDJ Metadata Year</dt>
                  <dd className="ops-dim">
                    {row.vdjYear}
                    {row.vdjYear !== row.chartYear
                      ? " · advisory (does not move chart placement)"
                      : " · matches chart year"}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <button type="button" className="ops-modal__close" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="ops-modal__status">
          <span>Current</span>
          <OpsPill tone={row.matchStatus === "matched" ? "ok" : "warn"}>
            {row.matchStatus.replaceAll("_", " ").toUpperCase()}
          </OpsPill>
          <span className="ops-dim">{row.bestMatch || "—"}</span>
        </div>

        {err ? <p className="ops-modal__error">{err}</p> : null}

        <h3 className="ops-modal__section-title">Suggested Matches</h3>
        {loading ? <p className="ops-dim">Loading suggested matches…</p> : null}

        <div className="ops-modal__candidates">
          {candidates.map((c) => (
            <button
              key={`cand-${c.mediaId}`}
              type="button"
              className={`ops-candidate${selectedMediaId === c.mediaId ? " ops-candidate--selected" : ""}`}
              onClick={() => setSelectedMediaId(c.mediaId)}
            >
              <div className="ops-candidate__top">
                <strong>{matchLabel(c)}</strong>
                <span className="ops-mono ops-dim">
                  {c.confidence != null ? `${c.confidence}%` : c.source}
                  {c.vdjYear != null ? ` · VDJ yr ${c.vdjYear}` : ""}
                </span>
              </div>
              <div className="ops-mono ops-wrap ops-dim">
                {c.localPath}
                {c.vdjYear != null && c.vdjYear !== row.chartYear ? (
                  <span>
                    {" "}
                    · VDJ Metadata Year {c.vdjYear} (chart year {row.chartYear})
                  </span>
                ) : null}
              </div>
            </button>
          ))}
          {!loading && candidates.length === 0 ? (
            <p className="ops-dim">No suggested matches for this chart item.</p>
          ) : null}
        </div>

        <h3 className="ops-modal__section-title">Search VDJ VIDEO Library</h3>
        <div className="ops-modal__search">
          <label className="ops-dim" htmlFor="ops-vdj-search">
            Search artist, title, filename, path, folder, or VDJ year
          </label>
          <input
            id="ops-vdj-search"
            type="search"
            className="ops-modal__search-input"
            placeholder={`e.g. ${row.artist} or ${row.title}`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
          {searchQuery.trim().length > 0 &&
          searchQuery.trim().length < VDJ_SEARCH_MIN_QUERY_LEN ? (
            <p className="ops-dim">
              Type at least {VDJ_SEARCH_MIN_QUERY_LEN} characters to search.
            </p>
          ) : null}
          {searchLoading ? <p className="ops-dim">Searching VIDEO library…</p> : null}
          {searchErr ? <p className="ops-modal__error">{searchErr}</p> : null}
          {!searchLoading && searchResults.length > 0 ? (
            <div className="ops-modal__search-results">
              {searchResults.map((hit) => (
                <div key={`search-${hit.mediaId}`} className="ops-candidate">
                  <div className="ops-candidate__top">
                    <strong>{matchLabel(hit)}</strong>
                    <span className="ops-mono ops-dim">
                      {hit.extension || "?"}
                      {hit.durationSeconds != null
                        ? ` · ${Math.floor(hit.durationSeconds / 60)}:${String(hit.durationSeconds % 60).padStart(2, "0")}`
                        : ""}
                      {hit.vdjYear != null ? ` · VDJ yr ${hit.vdjYear}` : ""}
                    </span>
                  </div>
                  <div className="ops-mono ops-wrap ops-dim">{hit.filepath}</div>
                  {hit.filename && hit.filename !== hit.title ? (
                    <div className="ops-mono ops-dim ops-wrap">{hit.filename}</div>
                  ) : null}
                  <div className="ops-candidate__actions">
                    <button
                      type="button"
                      className="ops-btn ops-btn--ok"
                      disabled={busy}
                      onClick={() => selectAsMatch(hit)}
                    >
                      Select as match
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!searchLoading &&
          searchQuery.trim().length >= VDJ_SEARCH_MIN_QUERY_LEN &&
          searchResults.length === 0 &&
          !searchErr ? (
            <p className="ops-dim">No VIDEO library hits for that query.</p>
          ) : null}
        </div>

        <footer className="ops-modal__actions">
          <button
            type="button"
            className="ops-btn ops-btn--ok"
            disabled={busy || !selectedMediaId}
            onClick={() => approveSelected()}
          >
            Approve selected
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--warn"
            disabled={busy}
            onClick={() => void postMatch("reject", null, null)}
          >
            Reject
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={busy}
            onClick={() => void postMatch("ignore", null, null)}
          >
            Ignore
          </button>
        </footer>
      </div>
    </div>
  );
}
