"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  GenerationCard,
  type GenerationCardData,
} from "@/components/ops/content-creator/GenerationCard";
import { JobQueuePanel } from "@/components/ops/content-creator/JobQueuePanel";
import { VariationBatchView } from "@/components/ops/content-creator/VariationBatchView";
import {
  CREATIVE_DIRECTION_IDS,
  CREATIVE_DIRECTIONS,
} from "@/lib/ops/content-creator/creative-direction";
import type { ContentCreatorEraOption } from "@/lib/ops/content-creator/types";

type Props = {
  eras: ContentCreatorEraOption[];
};

type LibraryView =
  | "inbox"
  | "all"
  | "favorites"
  | "rated"
  | "approved"
  | "production_ready"
  | "exported"
  | "variations"
  | "templates"
  | "archived";

type LibraryStats = {
  total: number;
  favorites: number;
  exports: number;
  archived: number;
  approved: number;
  productionReady: number;
  templates: number;
  byStatus: Record<string, number>;
  byCollection: Record<string, number>;
};

const VIEW_LABELS: Record<LibraryView, string> = {
  inbox: "Inbox",
  all: "All",
  favorites: "Favorites",
  rated: "Rated",
  approved: "Approved",
  production_ready: "Production Ready",
  exported: "Exported",
  variations: "Variations",
  templates: "Templates",
  archived: "Archive",
};

const VIEWS: LibraryView[] = [
  "inbox",
  "all",
  "favorites",
  "rated",
  "approved",
  "production_ready",
  "exported",
  "variations",
  "templates",
  "archived",
];

function activeFilterCount(filters: {
  q: string;
  eraSlug: string;
  creativeDirection: string;
  favoriteOnly: boolean;
  rating: string;
  tagFilter: string;
  collectionFilter: string;
  exportedFilter: string;
  variationFilter: string;
  dateFrom: string;
  dateTo: string;
}): number {
  let n = 0;
  if (filters.q.trim()) n += 1;
  if (filters.eraSlug) n += 1;
  if (filters.creativeDirection) n += 1;
  if (filters.favoriteOnly) n += 1;
  if (filters.rating) n += 1;
  if (filters.tagFilter.trim()) n += 1;
  if (filters.collectionFilter.trim()) n += 1;
  if (filters.exportedFilter) n += 1;
  if (filters.variationFilter && filters.variationFilter !== "all") n += 1;
  if (filters.dateFrom) n += 1;
  if (filters.dateTo) n += 1;
  return n;
}

export function MyGenerationsWorkspace({ eras }: Props) {
  const searchParams = useSearchParams();
  const batchParam = searchParams.get("batch");
  const [items, setItems] = useState<GenerationCardData[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [batchItems, setBatchItems] = useState<GenerationCardData[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(batchParam);
  const [view, setView] = useState<LibraryView>("inbox");
  const [q, setQ] = useState("");
  const [eraSlug, setEraSlug] = useState("");
  const [creativeDirection, setCreativeDirection] = useState("");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [rating, setRating] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("");
  const [exportedFilter, setExportedFilter] = useState("");
  const [variationFilter, setVariationFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(300);
  const [density, setDensity] = useState<"cards" | "compact">("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const filterState = {
    q,
    eraSlug,
    creativeDirection,
    favoriteOnly,
    rating,
    tagFilter,
    collectionFilter,
    exportedFilter,
    variationFilter,
    dateFrom,
    dateTo,
  };
  const filterCount = activeFilterCount(filterState);
  const hasActiveFilters = filterCount > 0;

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("view", view);
      params.set("limit", String(limit));
      if (q.trim()) params.set("q", q.trim());
      if (eraSlug) params.set("era", eraSlug);
      if (creativeDirection) params.set("direction", creativeDirection);
      if (favoriteOnly) params.set("favorite", "1");
      if (rating) params.set("rating", rating);
      if (tagFilter.trim()) params.set("tags", tagFilter.trim().toLowerCase());
      if (collectionFilter.trim()) params.set("collection", collectionFilter.trim());
      if (exportedFilter) params.set("exported", exportedFilter);
      if (variationFilter !== "all") params.set("variation", variationFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (sort !== "newest") params.set("sort", sort);
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
      setSelectedIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setBusy(false);
    }
  }, [
    view,
    limit,
    q,
    eraSlug,
    creativeDirection,
    favoriteOnly,
    rating,
    tagFilter,
    collectionFilter,
    exportedFilter,
    variationFilter,
    dateFrom,
    dateTo,
    sort,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setActiveBatchId(batchParam);
  }, [batchParam]);

  const loadBatch = useCallback(async (batchId: string) => {
    try {
      const res = await fetch(`/api/ops/content-creator/library?batch=${encodeURIComponent(batchId)}`);
      const data = (await res.json()) as { ok?: boolean; generations?: GenerationCardData[] };
      if (res.ok && data.generations) setBatchItems(data.generations);
    } catch {
      setBatchItems([]);
    }
  }, []);

  useEffect(() => {
    if (activeBatchId) void loadBatch(activeBatchId);
    else setBatchItems([]);
  }, [activeBatchId, loadBatch]);

  const batchParent = useMemo(() => {
    if (!batchItems.length) return null;
    const parentId = batchItems[0]?.parentGenerationId;
    if (!parentId) return null;
    return items.find((i) => i.id === parentId) ?? null;
  }, [batchItems, items]);

  const collectionOptions = useMemo(
    () => Object.entries(stats?.byCollection ?? {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [stats],
  );
  const viewCounts = useMemo(
    () => ({
      inbox: stats?.byStatus?.review ?? 0,
      all: Math.max(0, (stats?.total ?? 0) - (stats?.archived ?? 0)),
      favorites: stats?.favorites ?? 0,
      rated: null,
      approved: stats?.approved ?? 0,
      production_ready: stats?.productionReady ?? 0,
      exported: stats?.exports ?? 0,
      variations: null,
      templates: stats?.templates ?? 0,
      archived: stats?.archived ?? 0,
    }),
    [stats],
  );

  function clearFilters() {
    setQ("");
    setEraSlug("");
    setCreativeDirection("");
    setFavoriteOnly(false);
    setRating("");
    setTagFilter("");
    setCollectionFilter("");
    setExportedFilter("");
    setVariationFilter("all");
    setDateFrom("");
    setDateTo("");
    setSort("newest");
  }

  async function backfill() {
    setStatus("Scanning prior runs…");
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

  async function bulkCuratorChange(patch: Record<string, unknown>) {
    if (!selectedIds.length) return;
    setStatus(`Updating ${selectedIds.length} credentials…`);
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/ops/content-creator/library/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        }),
      ),
    );
    setStatus("Bulk update complete");
    await load();
  }

  function selectItem(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      if (selected) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }

  function selectAllVisible(selected: boolean) {
    setSelectedIds(selected ? items.map((item) => item.id) : []);
  }

  async function exportAgain(id: string) {
    setStatus("Exporting…");
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
    setStatus(`Queued ${count} variations…`);
    setError(null);
    try {
      const res = await fetch(`/api/ops/content-creator/library/${encodeURIComponent(id)}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count, background: true }),
      });
      const data = (await res.json()) as { ok?: boolean; jobId?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "variations_failed");
      setStatus(data.jobId ? `Variation job queued — track in Queue panel` : "Variations started");
    } catch (e) {
      setError(e instanceof Error ? e.message : "variations_failed");
    }
  }

  function openBatch(batchId: string) {
    setActiveBatchId(batchId);
    window.history.replaceState(null, "", `/ops/content-creator?batch=${encodeURIComponent(batchId)}`);
    void loadBatch(batchId);
  }

  function closeBatch() {
    setActiveBatchId(null);
    setBatchItems([]);
    window.history.replaceState(null, "", "/ops/content-creator");
  }

  function renderGrid(gridItems: GenerationCardData[]) {
    return (
      <div className="cc-library__grid">
        {gridItems.map((item) => (
          <GenerationCard
            key={item.id}
            item={item}
            onCuratorChange={curatorChange}
            onExport={exportAgain}
            onVariations={generateVariations}
            onViewBatch={openBatch}
            selected={selectedIds.includes(item.id)}
            onSelectedChange={selectItem}
            density={density}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="cc-creator cc-library">
      <JobQueuePanel />
      {activeBatchId ? (
        <VariationBatchView
          batchId={activeBatchId}
          items={batchItems}
          parent={batchParent}
          onCuratorChange={curatorChange}
          onExport={exportAgain}
          onVariations={generateVariations}
          onClose={closeBatch}
        />
      ) : null}
      <header className="cc-library__header">
        <div className="cc-library__brand">
          <h1>Collectible Library</h1>
          <p>Your generated credentials — browse by artwork, not spreadsheets.</p>
        </div>
        <Link href="/ops/content-creator/create" className="cc-library__create-btn">
          + New Credential
        </Link>
      </header>

      <nav className="cc-library__views" aria-label="Library views">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            className={`cc-library__view${view === v ? " is-on" : ""}`}
            onClick={() => {
              setView(v);
              setLimit(300);
            }}
          >
            <span>{VIEW_LABELS[v]}</span>
            {viewCounts[v] != null ? <strong>{viewCounts[v]}</strong> : null}
          </button>
        ))}
      </nav>

      {stats ? (
        <div className="cc-library__stats" aria-label="Library stats">
          <span>{stats.total} total</span>
          <span>{stats.favorites} favorites</span>
          <span>{stats.approved} approved</span>
          <span>{stats.productionReady} production ready</span>
          <span>{stats.exports} exported</span>
        </div>
      ) : null}

      <div className="cc-library__toolbar">
        <label className="cc-library__search-wrap">
          <span className="cc-library__search-icon" aria-hidden>
            ⌕
          </span>
          <input
            className="cc-library__search"
            placeholder="Search event, venue, tags, notes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search library"
          />
        </label>
        <button
          type="button"
          className={`cc-library__filter-toggle${filtersOpen ? " is-open" : ""}`}
          onClick={() => setFiltersOpen((open) => !open)}
          aria-expanded={filtersOpen}
        >
          Filters{filterCount > 0 ? ` (${filterCount})` : ""}
        </button>
      </div>

      <div className={`cc-library__drawer${filtersOpen ? " is-open" : ""}`} hidden={!filtersOpen}>
        <div className="cc-library__drawer-inner">
          <select className="cc-library__control" value={eraSlug} onChange={(e) => setEraSlug(e.target.value)} aria-label="Era">
            <option value="">All eras</option>
            {eras.map((era) => (
              <option key={era.slug} value={era.slug}>
                {era.years} — {era.name}
              </option>
            ))}
          </select>
          <select
            className="cc-library__control"
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
          <select className="cc-library__control" value={rating} onChange={(e) => setRating(e.target.value)} aria-label="Rating">
            <option value="">Any rating</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n} stars minimum
              </option>
            ))}
          </select>
          <input
            className="cc-library__control"
            placeholder="Tag filter"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            aria-label="Tag filter"
          />
          <select
            className="cc-library__control"
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            aria-label="Collection"
          >
            <option value="">All collections</option>
            {collectionOptions.map(([name, count]) => (
              <option key={name} value={name}>
                {name} ({count})
              </option>
            ))}
          </select>
          <select
            className="cc-library__control"
            value={exportedFilter}
            onChange={(e) => setExportedFilter(e.target.value)}
            aria-label="Export state"
          >
            <option value="">Any export state</option>
            <option value="1">Exported</option>
            <option value="0">Not exported</option>
          </select>
          <select
            className="cc-library__control"
            value={variationFilter}
            onChange={(e) => setVariationFilter(e.target.value)}
            aria-label="Variation state"
          >
            <option value="all">Roots and variations</option>
            <option value="roots">Root credentials only</option>
            <option value="variations">Variations only</option>
          </select>
          <select className="cc-library__control" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="updated">Recently updated</option>
            <option value="rating">Highest rated</option>
            <option value="era">Era</option>
            <option value="event">Event</option>
            <option value="exported">Export date</option>
          </select>
          <input
            type="date"
            className="cc-library__control"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
          />
          <input
            type="date"
            className="cc-library__control"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
          />
          <label className="cc-library__checkbox">
            <input type="checkbox" checked={favoriteOnly} onChange={(e) => setFavoriteOnly(e.target.checked)} />
            Favorites only
          </label>
          <label className="cc-library__checkbox">
            <input
              type="checkbox"
              checked={density === "compact"}
              onChange={(e) => setDensity(e.target.checked ? "compact" : "cards")}
            />
            Compact cards
          </label>
          <div className="cc-library__drawer-actions">
            <button type="button" className="cc-library__drawer-btn" disabled={busy} onClick={() => void load()}>
              Refresh
            </button>
            <button type="button" className="cc-library__drawer-btn" onClick={() => void backfill()}>
              Import prior runs
            </button>
            {hasActiveFilters ? (
              <button type="button" className="cc-library__drawer-btn cc-library__drawer-btn--ghost" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {items.length ? (
        <div className="cc-library__bulk">
          <label className="cc-library__checkbox">
            <input
              type="checkbox"
              checked={selectedIds.length > 0 && selectedIds.length === items.length}
              onChange={(e) => selectAllVisible(e.target.checked)}
            />
            Select visible
          </label>
          <span>{selectedIds.length} selected</span>
          <button type="button" disabled={!selectedIds.length} onClick={() => void bulkCuratorChange({ status: "approved" })}>
            Approve
          </button>
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => void bulkCuratorChange({ status: "production_ready" })}
          >
            Production ready
          </button>
          <button type="button" disabled={!selectedIds.length} onClick={() => void bulkCuratorChange({ status: "archived" })}>
            Archive
          </button>
          <button type="button" disabled={!selectedIds.length} onClick={() => void bulkCuratorChange({ status: "review" })}>
            Restore to review
          </button>
          <button
            type="button"
            disabled={!selectedIds.length}
            onClick={() => void bulkCuratorChange({ template: { isTemplate: true } })}
          >
            Mark template
          </button>
        </div>
      ) : null}

      {error ? <p className="cc-library__banner cc-library__banner--error">{error}</p> : null}
      {status ? <p className="cc-library__banner cc-library__banner--status">{status}</p> : null}

      {busy && !items.length ? (
        <div className="cc-library__loading" aria-live="polite">
          <div className="cc-library__loading-art" aria-hidden />
          <p>Loading your library…</p>
        </div>
      ) : null}

      {!busy && !items.length ? (
        <div className="cc-library__empty">
          <div className="cc-library__empty-art" aria-hidden>
            <span className="cc-library__empty-card cc-library__empty-card--a" />
            <span className="cc-library__empty-card cc-library__empty-card--b" />
            <span className="cc-library__empty-card cc-library__empty-card--c" />
          </div>
          <h2>{hasActiveFilters ? "No matches" : "Your library is empty"}</h2>
          <p>
            {hasActiveFilters
              ? "Try different filters or clear them to see everything."
              : "Generate VIP pass credentials and they will appear here as large artwork cards."}
          </p>
          {hasActiveFilters ? (
            <button type="button" className="cc-library__empty-btn" onClick={clearFilters}>
              Clear filters
            </button>
          ) : (
            <Link href="/ops/content-creator/create" className="cc-library__empty-btn">
              Create First Credential
            </Link>
          )}
        </div>
      ) : null}

      {items.length > 0 ? (
        <div className={`cc-library__sections${busy ? " is-busy" : ""}`}>
          <section className="cc-library__section" aria-label={`${VIEW_LABELS[view]} credentials`}>
            <header className="cc-library__section-head">
              <h2>{hasActiveFilters ? `${VIEW_LABELS[view]} Results` : VIEW_LABELS[view]}</h2>
              <span>{items.length} credential{items.length === 1 ? "" : "s"}</span>
            </header>
            {renderGrid(items)}
            {items.length >= limit ? (
              <button type="button" className="cc-library__load-more" onClick={() => setLimit((n) => n + 300)}>
                Load 300 more
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
