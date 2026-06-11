"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  GenerationCard,
  type GenerationCardData,
} from "@/components/ops/content-creator/GenerationCard";
import {
  CREATIVE_DIRECTION_IDS,
  CREATIVE_DIRECTIONS,
} from "@/lib/ops/content-creator/creative-direction";
import type { ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import type { LibraryStats } from "@/lib/ops/content-creator/library/types";

type Props = {
  eras: ContentCreatorEraOption[];
};

export function MyGenerationsWorkspace({ eras }: Props) {
  const [items, setItems] = useState<GenerationCardData[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [q, setQ] = useState("");
  const [eraSlug, setEraSlug] = useState("");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [rating, setRating] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (eraSlug) params.set("era", eraSlug);
      if (creativeDirection) params.set("direction", creativeDirection);
      if (favoriteOnly) params.set("favorite", "1");
      if (rating) params.set("rating", rating);
      if (tagFilter.trim()) params.set("tags", tagFilter.trim().toLowerCase());
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      const res = await fetch(`/api/ops/content-creator/library?${params}`);
      const data = (await res.json()) as {
        ok?: boolean;
        generations?: GenerationCardData[];
        stats?: LibraryStats;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "load_failed");
      setItems(data.generations ?? []);
      setStats(data.stats ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setBusy(false);
    }
  }, [q, eraSlug, creativeDirection, favoriteOnly, rating, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function backfill() {
    setStatus("Scanning vnext runs…");
    await fetch("/api/ops/content-creator/library?backfill=1");
    setStatus("Import complete");
    await load();
  }

  async function curatorChange(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/ops/content-creator/library/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function exportAgain(id: string) {
    setStatus(`Exporting…`);
    const res = await fetch(`/api/ops/content-creator/library/${encodeURIComponent(id)}/export`, {
      method: "POST",
    });
    const data = (await res.json()) as { ok?: boolean; exportZipUrl?: string; error?: string; message?: string };
    if (!res.ok || !data.ok) {
      setError(data.message ?? data.error ?? "export_failed");
      return;
    }
    if (data.exportZipUrl) window.open(data.exportZipUrl, "_blank");
    setStatus("Export complete");
    await load();
  }

  async function generateVariations(id: string, count: number) {
    setStatus(`Generating ${count} variations… (this may take several minutes)`);
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/content-creator/library/${encodeURIComponent(id)}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = (await res.json()) as { ok?: boolean; runIds?: string[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "variations_failed");
      setStatus(`Created ${data.runIds?.length ?? 0} variations`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "variations_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cc-creator cc-generations">
      <header className="cc-creator__titlebar cc-generations__head">
        <div>
          <h1>Collectible Library</h1>
          <p className="cc-generations__sub">
            Browse · favorite · generate variations · export your best credentials.
          </p>
        </div>
        <div className="cc-generations__head-actions">
          <Link href="/ops/content-creator/create" className="cc-creator__btn cc-creator__btn--generate">
            + New Credential
          </Link>
          <button type="button" className="cc-creator__btn cc-creator__btn--secondary" onClick={() => void backfill()}>
            Import prior runs
          </button>
        </div>
      </header>

      {stats ? (
        <section className="cc-generations__dashboard" aria-label="Library dashboard">
          <div className="cc-generations__stat">
            <span className="cc-generations__stat-n">{stats.total}</span>
            <span className="cc-generations__stat-l">Total</span>
          </div>
          <div className="cc-generations__stat">
            <span className="cc-generations__stat-n">{stats.favorites}</span>
            <span className="cc-generations__stat-l">Favorites</span>
          </div>
          <div className="cc-generations__stat">
            <span className="cc-generations__stat-n">{stats.exports}</span>
            <span className="cc-generations__stat-l">Exports</span>
          </div>
          <div className="cc-generations__stat cc-generations__stat--wide">
            <span className="cc-generations__stat-l">By Era</span>
            <div className="cc-generations__chips">
              {Object.entries(stats.byEra).map(([name, n]) => (
                <button
                  key={name}
                  type="button"
                  className="cc-generations__chip"
                  onClick={() => {
                    const era = eras.find((e) => e.name === name);
                    if (era) setEraSlug(era.slug);
                  }}
                >
                  {name} ({n})
                </button>
              ))}
            </div>
          </div>
          <div className="cc-generations__stat cc-generations__stat--wide">
            <span className="cc-generations__stat-l">By Direction</span>
            <div className="cc-generations__chips">
              {Object.entries(stats.byCreativeDirection).map(([name, n]) => (
                <button
                  key={name}
                  type="button"
                  className="cc-generations__chip"
                  onClick={() => {
                    const id = CREATIVE_DIRECTION_IDS.find((d) => CREATIVE_DIRECTIONS[d].label === name);
                    if (id) setCreativeDirection(id);
                  }}
                >
                  {name} ({n})
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="cc-generations__filters">
        <input
          className="cc-generations__search"
          placeholder="Search event, venue, tags, notes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search generations"
        />
        <select className="cc-generations__era" value={eraSlug} onChange={(e) => setEraSlug(e.target.value)} aria-label="Era">
          <option value="">All eras</option>
          {eras.map((era) => (
            <option key={era.slug} value={era.slug}>
              {era.years} — {era.name}
            </option>
          ))}
        </select>
        <select
          className="cc-generations__era"
          value={creativeDirection}
          onChange={(e) => setCreativeDirection(e.target.value)}
          aria-label="Creative direction"
        >
          <option value="">All directions</option>
          {CREATIVE_DIRECTION_IDS.map((id) => (
            <option key={id} value={id}>
              {CREATIVE_DIRECTIONS[id].label}
            </option>
          ))}
        </select>
        <select className="cc-generations__era" value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Rating">
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={String(n)}>
              {n} stars
            </option>
          ))}
        </select>
        <input
          className="cc-generations__tags-filter"
          placeholder="Tag filter"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Tag filter"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        <label className="cc-generations__fav-toggle">
          <input type="checkbox" checked={favoriteOnly} onChange={(e) => setFavoriteOnly(e.target.checked)} />
          Favorites
        </label>
        <button type="button" className="cc-creator__btn cc-creator__btn--secondary" disabled={busy} onClick={() => void load()}>
          Refresh
        </button>
      </section>

      {error ? <p className="cc-generations__error">{error}</p> : null}
      {status ? <p className="cc-generations__status">{status}</p> : null}

      {busy && !items.length ? <p className="cc-generations__empty">Loading…</p> : null}
      {!busy && !items.length ? (
        <p className="cc-generations__empty">
          No generations yet.{" "}
          <Link href="/ops/content-creator/create">Create your first credential</Link>.
        </p>
      ) : null}

      <div className="cc-generations__grid">
        {items.map((item) => (
          <GenerationCard
            key={item.id}
            item={item}
            onCuratorChange={curatorChange}
            onExport={exportAgain}
            onVariations={generateVariations}
          />
        ))}
      </div>
    </div>
  );
}
