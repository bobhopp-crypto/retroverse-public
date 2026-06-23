"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type {
  SongPackageCoverStatus,
  SongPackageManagementRow,
  SongPackageManagementStatus,
  SongPackageManagementView,
} from "@/lib/ops/intelligence/load-song-package-management";
import type { PackageIssueFlag, SongPackage, StoryCard } from "@/lib/ops/intelligence/song-package-types";

type Props = {
  view: SongPackageManagementView;
  initialRvtr?: string | null;
};

type QuickFilter =
  | "missing"
  | "ready"
  | "review"
  | "most_played_missing"
  | "recent"
  | null;

const PACKAGE_OPTIONS: Array<{ value: "all" | SongPackageManagementStatus; label: string }> = [
  { value: "all", label: "All Package Statuses" },
  { value: "missing_package", label: "Missing Package" },
  { value: "package_exists", label: "Package Exists" },
  { value: "needs_review", label: "Needs Review" },
];

const COVER_OPTIONS: Array<{ value: "all" | SongPackageCoverStatus; label: string }> = [
  { value: "all", label: "All Cover Statuses" },
  { value: "has_cover", label: "Cover Exists" },
  { value: "missing_cover", label: "Missing Cover" },
];

const ISSUE_OPTIONS: Array<{ flag: PackageIssueFlag; label: string }> = [
  { flag: "wrong_cover", label: "Wrong Cover" },
  { flag: "missing_cover", label: "Missing Cover" },
  { flag: "bad_research", label: "Bad Research" },
  { flag: "missing_artist_image", label: "Missing Artist Image" },
];

function issueLabel(flag: PackageIssueFlag): string {
  return ISSUE_OPTIONS.find((option) => option.flag === flag)?.label ?? flag;
}

type RowsState = {
  rows: SongPackageManagementRow[];
  page: number;
  pageCount: number;
  total: number;
  loading: boolean;
};

type RowsResponse = {
  ok?: boolean;
  error?: string;
  rows?: SongPackageManagementRow[];
  page?: number;
  pageCount?: number;
  total?: number;
};

const EMPTY_ROWS: RowsState = { rows: [], page: 1, pageCount: 1, total: 0, loading: true };

export function SongPackagesCommandCenter({ view, initialRvtr }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const [artist, setArtist] = useState("all");
  const [packageStatus, setPackageStatus] =
    useState<"all" | SongPackageManagementStatus>("all");
  const [coverStatus, setCoverStatus] = useState<"all" | SongPackageCoverStatus>("all");
  const [minimumPlayCount, setMinimumPlayCount] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeRvtr, setActiveRvtr] = useState(initialRvtr ?? "");
  const [gallery, setGallery] = useState<RowsState>(EMPTY_ROWS);
  const [queue, setQueue] = useState<RowsState>(EMPTY_ROWS);
  const [maintenance, setMaintenance] = useState<RowsState>(EMPTY_ROWS);
  const [galleryPage, setGalleryPage] = useState(1);
  const [queuePage, setQueuePage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCount = selected.size;
  const galleryRows = gallery.rows;
  const queueRows = queue.rows;
  const maintenanceRows = maintenance.rows;
  const activeRow =
    [...galleryRows, ...maintenanceRows, ...queueRows].find((row) => row.rvtr === activeRvtr) ??
    galleryRows[0] ??
    maintenanceRows[0] ??
    queueRows[0] ??
    null;
  const visibleMissingRvtrs = queueRows
    .filter((row) => row.packageStatus === "missing_package")
    .map((row) => row.rvtr);

  useEffect(() => {
    setGalleryPage(1);
    setQueuePage(1);
    setMaintenancePage(1);
  }, [artist, coverStatus, minimumPlayCount, packageStatus, query, quickFilter, year]);

  useEffect(() => {
    let cancelled = false;

    async function loadRows(mode: "gallery" | "queue" | "maintenance", page: number, pageSize: number) {
      const params = new URLSearchParams({
        mode,
        page: String(page),
        pageSize: String(pageSize),
        query,
        year,
        artist,
        packageStatus,
        coverStatus,
        minimumPlayCount,
        quickFilter: quickFilter ?? "null",
      });
      const res = await fetch(`/api/ops/intelligence/packages?${params.toString()}`);
      const data = (await res.json()) as RowsResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return {
        rows: data.rows ?? [],
        page: data.page ?? page,
        pageCount: data.pageCount ?? 1,
        total: data.total ?? 0,
        loading: false,
      };
    }

    async function run() {
      setGallery((current) => ({ ...current, loading: true }));
      setQueue((current) => ({ ...current, loading: true }));
      setMaintenance((current) => ({ ...current, loading: true }));
      try {
        const [galleryData, queueData, maintenanceData] = await Promise.all([
          loadRows("gallery", galleryPage, 24),
          loadRows("queue", queuePage, 75),
          loadRows("maintenance", maintenancePage, 30),
        ]);
        if (cancelled) return;
        setGallery(galleryData);
        setQueue(queueData);
        setMaintenance(maintenanceData);
        if (galleryData.rows[0]) {
          setActiveRvtr((current) => current || galleryData.rows[0]!.rvtr);
        }
      } catch (err) {
        if (!cancelled) {
          setMessage(err instanceof Error ? err.message : "Could not load package rows.");
          setGallery((current) => ({ ...current, loading: false }));
          setQueue((current) => ({ ...current, loading: false }));
          setMaintenance((current) => ({ ...current, loading: false }));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    artist,
    coverStatus,
    galleryPage,
    maintenancePage,
    minimumPlayCount,
    packageStatus,
    query,
    queuePage,
    quickFilter,
    year,
  ]);

  function resetSelection() {
    setSelected(new Set());
  }

  function setSelectedRvtr(rvtr: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(rvtr);
      else next.delete(rvtr);
      return next;
    });
  }

  function applyQuickFilter(next: QuickFilter) {
    setQuickFilter(next);
    setSelected(new Set());
    if (next === "missing" || next === "most_played_missing") {
      setPackageStatus("missing_package");
    } else if (next === "ready") {
      setPackageStatus("package_exists");
    } else if (next === "review") {
      setPackageStatus("needs_review");
    } else if (next === "recent") {
      setPackageStatus("all");
    }
  }

  function pageControls(state: RowsState, setPage: (page: number) => void) {
    return (
      <div className="package-center__pager">
        <button
          type="button"
          className="intel-mini-btn"
          disabled={state.loading || state.page <= 1}
          onClick={() => setPage(Math.max(1, state.page - 1))}
        >
          Previous
        </button>
        <span>
          Page {state.page} / {state.pageCount} · {state.total.toLocaleString()} total
        </span>
        <button
          type="button"
          className="intel-mini-btn"
          disabled={state.loading || state.page >= state.pageCount}
          onClick={() => setPage(Math.min(state.pageCount, state.page + 1))}
        >
          Next
        </button>
      </div>
    );
  }

  async function generatePackages(rvtrs: string[]) {
    const targets = [...new Set(rvtrs)].filter(Boolean);
    if (targets.length === 0) return;

    setGenerating(true);
    setMessage(`Generating ${targets.length} package${targets.length === 1 ? "" : "s"}...`);

    let succeeded = 0;
    let failed = 0;
    for (const rvtr of targets) {
      try {
        const res = await fetch(`/api/ops/intelligence/${rvtr}`, { method: "POST" });
        if (res.ok) succeeded += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    setGenerating(false);
    setMessage(`Generated ${succeeded}; failed ${failed}.`);
    setSelected(new Set());
    router.refresh();
  }

  async function loadPackage(rvtr: string): Promise<SongPackage | null> {
    const res = await fetch(`/api/ops/intelligence/${rvtr}`);
    const data = (await res.json()) as { ok?: boolean; error?: string; package?: SongPackage };
    if (!res.ok || !data.package) {
      setMessage(data.error ?? `Could not load ${rvtr}.`);
      return null;
    }
    return data.package;
  }

  async function patchPackage(rvtr: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/ops/intelligence/${rvtr}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok?: boolean; error?: string; package?: SongPackage };
    if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.package ?? null;
  }

  async function updateFirstCard(rvtr: string, mutate: (card: StoryCard) => StoryCard, label: string) {
    setActionBusy(true);
    setMessage(null);
    try {
      const pkg = await loadPackage(rvtr);
      if (!pkg || pkg.storyCards.length === 0) {
        setMessage("No cards found for that package.");
        return;
      }
      const index = Math.max(0, pkg.storyCards.findIndex((card) => card.rank > 0 && !card.hidden));
      const storyCards = pkg.storyCards.map((card, cardIndex) =>
        cardIndex === index ? mutate(card) : card,
      );
      await patchPackage(rvtr, { storyCards });
      setMessage(`${label} saved for ${rvtr}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Card action failed.");
    } finally {
      setActionBusy(false);
    }
  }

  async function regenerateCards(rvtr: string) {
    setActionBusy(true);
    setMessage(null);
    try {
      await patchPackage(rvtr, { action: "build_cards" });
      setMessage(`Cards regenerated for ${rvtr}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Regenerate failed.");
    } finally {
      setActionBusy(false);
    }
  }

  async function toggleIssue(rvtr: string, flag: PackageIssueFlag) {
    setActionBusy(true);
    setMessage(null);
    try {
      const pkg = await loadPackage(rvtr);
      if (!pkg) return;
      const current = new Set(pkg.issueFlags ?? []);
      if (current.has(flag)) current.delete(flag);
      else current.add(flag);
      await patchPackage(rvtr, { issueFlags: [...current] });
      setMessage(`${issueLabel(flag)} updated for ${rvtr}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Issue update failed.");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="song-packages">
      <section id="dashboard" className="package-center__section" aria-label="Package dashboard">
        <div className="package-center__section-head">
          <p className="package-center__eyebrow">1. Dashboard</p>
          <h2>Package health at a glance</h2>
        </div>
        <div className="song-packages__stats">
          <div className="song-packages__stat">
            <p>{view.stats.total}</p>
            <span>Songs</span>
          </div>
          <div className="song-packages__stat">
            <p>{view.stats.packageExists}</p>
            <span>Package Exists</span>
          </div>
          <div className="song-packages__stat">
            <p>{view.stats.needsReview}</p>
            <span>Needs Review</span>
          </div>
          <div className="song-packages__stat">
            <p>{view.stats.missingPackage}</p>
            <span>Missing Package</span>
          </div>
          <div className="song-packages__stat">
            <p>{view.stats.missingCover}</p>
            <span>Missing Cover</span>
          </div>
          <div className="song-packages__stat">
            <p>{view.stats.retroverseCoverage.coveragePct}%</p>
            <span>
              Retroverse Coverage · {view.stats.retroverseCoverage.distinctRvtrs.toLocaleString()} RVTRs ·{" "}
              {view.stats.retroverseCoverage.mappedVdjFiles.toLocaleString()} VDJ files
            </span>
          </div>
        </div>
      </section>

      <section id="gallery" className="package-center__section" aria-label="Package gallery">
        <div className="package-center__section-head">
          <p className="package-center__eyebrow">2. Gallery</p>
          <h2>Swipe card previews</h2>
          <p>Cover, health, flags, and card actions for existing packages.</p>
        </div>
        {pageControls(gallery, setGalleryPage)}
        <div className="package-gallery" tabIndex={0} aria-label="Swipeable package card preview">
          {gallery.loading ? <p className="intel-dim">Loading gallery…</p> : null}
          {galleryRows.map((row) => (
            <article
              key={row.rvtr}
              className={`package-gallery__card${activeRow?.rvtr === row.rvtr ? " package-gallery__card--active" : ""}`}
            >
              <button type="button" className="package-gallery__select" onClick={() => setActiveRvtr(row.rvtr)}>
                {row.coverUrl ? (
                  <Image
                    src={row.coverUrl}
                    alt=""
                    width={180}
                    height={180}
                    className="package-gallery__cover"
                    unoptimized
                  />
                ) : (
                  <span className="package-gallery__cover package-gallery__cover--empty">No Cover</span>
                )}
                <span className="package-gallery__artist">{row.artist}</span>
                <strong>{row.title}</strong>
              </button>
              <div className="package-gallery__metrics">
                <span>Health {row.healthScore}%</span>
                <span>{row.flagCount} flags</span>
                <span>{row.cardCount} cards</span>
              </div>
              <p className="package-gallery__preview">
                {row.firstCardHeadline ?? row.firstCardFact ?? "No card preview yet."}
              </p>
              <div className="package-gallery__actions">
                {row.detailHref ? (
                  <Link className="intel-mini-btn" href={row.detailHref} prefetch={false}>
                    Edit Card
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="intel-mini-btn"
                  disabled={actionBusy || row.cardCount === 0}
                  onClick={() => updateFirstCard(row.rvtr, (card) => ({ ...card, hidden: true }), "Hide card")}
                >
                  Hide Card
                </button>
                <button
                  type="button"
                  className="intel-mini-btn"
                  disabled={actionBusy || row.cardCount === 0}
                  onClick={() => updateFirstCard(row.rvtr, (card) => ({ ...card, locked: true }), "Lock card")}
                >
                  Lock Card
                </button>
                <button
                  type="button"
                  className="intel-mini-btn"
                  disabled={actionBusy || !row.packageRawStatus}
                  onClick={() => regenerateCards(row.rvtr)}
                >
                  Regenerate Card
                </button>
                <button
                  type="button"
                  className="intel-mini-btn"
                  disabled={actionBusy || !row.packageRawStatus}
                  onClick={() => toggleIssue(row.rvtr, "bad_research")}
                >
                  Flag Package Issue
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="queue" className="package-center__section" aria-label="Package queue">
        <div className="package-center__section-head">
          <p className="package-center__eyebrow">3. Queue</p>
          <h2>Find, filter, and generate</h2>
        </div>
        <section className="song-packages__filters" aria-label="Song package filters">
          <label>
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Artist, title, or RVTR"
            />
          </label>
          <label>
            <span>Year</span>
            <select value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="all">All Years</option>
              {view.years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Artist</span>
            <select value={artist} onChange={(event) => setArtist(event.target.value)}>
              <option value="all">All Artists</option>
              {view.artists.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Package Status</span>
            <select
              value={packageStatus}
              onChange={(event) => setPackageStatus(event.target.value as typeof packageStatus)}
            >
              {PACKAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Cover Status</span>
            <select
              value={coverStatus}
              onChange={(event) => setCoverStatus(event.target.value as typeof coverStatus)}
            >
              {COVER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Minimum Play Count</span>
            <input
              inputMode="numeric"
              value={minimumPlayCount}
              onChange={(event) => setMinimumPlayCount(event.target.value)}
              placeholder="0"
            />
          </label>
        </section>

        <section className="song-packages__quick" aria-label="Quick filters">
          <button type="button" onClick={() => applyQuickFilter("missing")}>
            Missing Packages
          </button>
          <button type="button" onClick={() => applyQuickFilter("ready")}>
            Package Ready
          </button>
          <button type="button" onClick={() => applyQuickFilter("review")}>
            Needs Review
          </button>
          <button type="button" onClick={() => applyQuickFilter("most_played_missing")}>
            Most Played Missing Packages
          </button>
          <button type="button" onClick={() => applyQuickFilter("recent")}>
            Recently Generated
          </button>
        </section>

        <section className="song-packages__actions" aria-label="Package generation actions">
          <button
            type="button"
            className="intel-btn intel-btn--primary"
            disabled={generating || selectedCount === 0}
            onClick={() => generatePackages([...selected])}
          >
            Generate Packages
          </button>
          <button
            type="button"
            className="intel-btn"
            disabled={generating || visibleMissingRvtrs.length === 0}
            onClick={() => generatePackages(visibleMissingRvtrs)}
          >
            Generate Missing Packages
          </button>
          <button type="button" className="intel-btn" disabled={generating} onClick={resetSelection}>
            Clear Selection
          </button>
          <p>{selectedCount} selected</p>
          {message ? <p role="status">{message}</p> : null}
        </section>

        {pageControls(queue, setQueuePage)}
        <div className="song-packages__table-wrap">
          <table className="song-packages__table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Artist</th>
                <th>Title</th>
                <th>Year</th>
                <th>Play Count</th>
                <th>RVTR</th>
                <th>Package Status</th>
                <th>Cover Status</th>
              </tr>
            </thead>
            <tbody>
              {queueRows.map((row) => (
                <tr key={row.rvtr}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(row.rvtr)}
                      onChange={(event) => setSelectedRvtr(row.rvtr, event.target.checked)}
                      aria-label={`Select ${row.title}`}
                    />
                  </td>
                  <td>{row.artist}</td>
                  <td>
                    {row.detailHref ? (
                      <Link href={row.detailHref} prefetch={false}>
                        {row.title}
                      </Link>
                    ) : (
                      row.title
                    )}
                  </td>
                  <td>{row.year ?? "—"}</td>
                  <td>{row.playCount.toLocaleString()}</td>
                  <td>{row.rvtr}</td>
                  <td>
                    <span className={`song-packages__pill song-packages__pill--${row.packageStatus}`}>
                      {row.packageStatusLabel}
                    </span>
                    {row.packageRawStatus ? (
                      <span className="song-packages__raw-status">{row.packageRawStatus}</span>
                    ) : null}
                  </td>
                  <td>
                    <span className={`song-packages__pill song-packages__pill--${row.coverStatus}`}>
                      {row.coverStatusLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="maintenance" className="package-center__section" aria-label="Package maintenance">
        <div className="package-center__section-head">
          <p className="package-center__eyebrow">4. Maintenance</p>
          <h2>Fix the issues that block Sunday night testing</h2>
          <p>{maintenanceRows.length} packages currently need attention.</p>
        </div>
        {activeRow ? (
          <div className="package-maintenance">
            <div>
              <p className="package-maintenance__active">Selected: {activeRow.title}</p>
              <p>{activeRow.artist} · {activeRow.rvtr}</p>
            </div>
            <div className="package-maintenance__actions">
              {ISSUE_OPTIONS.map((option) => (
                <button
                  key={option.flag}
                  type="button"
                  className={`intel-mini-btn${activeRow.issueFlags.includes(option.flag) ? " package-maintenance__flag--active" : ""}`}
                  disabled={actionBusy || !activeRow.packageRawStatus}
                  onClick={() => toggleIssue(activeRow.rvtr, option.flag)}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className="intel-mini-btn"
                disabled
                title="Hidden cards are managed from the gallery card actions."
              >
                Hidden Cards: {activeRow.hiddenCardCount}
              </button>
            </div>
          </div>
        ) : null}
        <div className="package-maintenance__summary">
          {ISSUE_OPTIONS.map((option) => (
            <span key={option.flag}>
              {option.label}: {maintenanceRows.filter((row) => row.issueFlags.includes(option.flag)).length}
            </span>
          ))}
          <span>
            Hidden Cards: {maintenanceRows.reduce((sum, row) => sum + row.hiddenCardCount, 0)}
          </span>
        </div>
        {pageControls(maintenance, setMaintenancePage)}
      </section>
    </div>
  );
}
