"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import type { PerformanceBrowserResult, PerformanceBrowserRow } from "@/lib/ops/media-lab/performance-browser/types";

type BrowseResponse = PerformanceBrowserResult & { ok: boolean; error?: string };

const CLASSIFICATIONS = [
  "all",
  "Performance",
  "Comedy",
  "Interview",
  "Intro",
  "Movie Clip",
  "Commercial",
  "Unknown",
] as const;

const STATUSES = ["all", "candidate", "review", "accepted", "rejected", "exported"] as const;

function statusTone(status: PerformanceBrowserRow["status"]): "ok" | "warn" | "bad" | "info" {
  if (status === "accepted" || status === "exported") return "ok";
  if (status === "review") return "warn";
  if (status === "rejected") return "bad";
  return "info";
}

export function MediaLabPerformanceBrowser() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BrowseResponse | null>(null);
  const [q, setQ] = useState("");
  const [collection, setCollection] = useState("all");
  const [year, setYear] = useState("all");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("all");
  const [classification, setClassification] = useState<(typeof CLASSIFICATIONS)[number]>("all");

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (q.trim()) search.set("q", q.trim());
    if (collection !== "all") search.set("collection", collection);
    if (year !== "all") search.set("year", year);
    if (status !== "all") search.set("status", status);
    if (classification !== "all") search.set("classification", classification);
    search.set("limit", "500");
    return search.toString();
  }, [q, collection, year, status, classification]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/media-lab/performances/browse?${params}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as BrowseResponse;
      if (!res.ok || !json.ok) {
        setError(json.error ?? "browse_failed");
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "browse_failed");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [load, q]);

  const yearOptions = data?.facets.years ?? [];

  return (
    <section className="ml-perf-browser">
      <div className="ml-perf-browser__header">
        <div>
          <h2 className="mc-card__title" style={{ marginTop: 0 }}>
            Performance Browser
          </h2>
          <p className="ops-dim">
            Search and open performance manifests directly in clip review — no review queue required.
          </p>
        </div>
        <Link className="ops-btn ops-btn--link" href="/ops/media-lab">
          ← Media Lab
        </Link>
      </div>

      <div className="ml-perf-browser__search">
        <input
          className="ops-input ml-perf-browser__search-input"
          type="search"
          placeholder="Search artist, title, collection, episode ID…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="ml-perf-browser__filters mc-actions">
        <label className="ml-perf-browser__filter">
          <span>Collection</span>
          <select
            className="ops-input"
            value={collection}
            onChange={(e) => setCollection(e.target.value)}
          >
            <option value="all">All enabled</option>
            {(data?.collections ?? [])
              .filter((c) => c.enabled)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.performance_count ?? 0})
                </option>
              ))}
          </select>
        </label>
        <label className="ml-perf-browser__filter">
          <span>Year</span>
          <select className="ops-input" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">All</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-perf-browser__filter">
          <span>Status</span>
          <select className="ops-input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All" : s}
              </option>
            ))}
          </select>
        </label>
        <label className="ml-perf-browser__filter">
          <span>Classification</span>
          <select
            className="ops-input"
            value={classification}
            onChange={(e) => setClassification(e.target.value as typeof classification)}
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ops-btn" disabled={loading} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="ml-perf-browser__stats mc-storage-row">
        <span>
          Total: <strong>{data?.total ?? "—"}</strong>
        </span>
        <span>
          Showing: <strong>{data?.filtered ?? "—"}</strong>
        </span>
        {(data?.collections ?? [])
          .filter((c) => !c.enabled)
          .map((c) => (
            <span key={c.id} className="ops-dim">
              {c.title} (coming soon)
            </span>
          ))}
      </div>

      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}

      <OpsTable
        columns={[
          { key: "artist", label: "Artist" },
          { key: "title", label: "Title" },
          { key: "collection", label: "Collection" },
          { key: "year", label: "Year", align: "right" },
          { key: "episode", label: "Episode" },
          { key: "class", label: "Class" },
          { key: "status", label: "Status" },
          { key: "actions", label: "Actions" },
        ]}
        rows={(data?.rows ?? []).map((row) => ({
          id: row.performance_id,
          tone: statusTone(row.status),
          cells: {
            artist: <span className="ml-perf-browser__artist">{row.artist || "—"}</span>,
            title: row.title || "—",
            collection: row.collection_title,
            year: row.year ?? "—",
            episode: (
              <span className="ops-dim" title={row.episode_title}>
                <code>{row.episode_id}</code>
              </span>
            ),
            class: row.classification,
            status: <OpsPill tone={statusTone(row.status)}>{row.status.toUpperCase()}</OpsPill>,
            actions: (
              <Link className="ops-btn ops-btn--info" href={row.clip_review_href}>
                Open in Media Lab
              </Link>
            ),
          },
        }))}
        empty={loading ? "Loading performances…" : "No performances match these filters."}
      />
    </section>
  );
}
