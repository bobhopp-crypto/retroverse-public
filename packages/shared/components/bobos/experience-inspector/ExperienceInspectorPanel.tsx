"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import {
  buildOperatorWorkspace,
  FUTURE_TOOLS,
} from "@/lib/ops/intelligence/experience-inspector/operator-workspace";
import {
  groupInventorySections,
  type PresentationCategoryView,
} from "@/lib/ops/intelligence/experience-inspector/presentation-categories";
import type {
  PublicNavModel,
  PublicStatusFlag,
} from "@/lib/ops/intelligence/experience-inspector/public-status";
import type {
  ExperienceInventory,
  ExperienceInventorySection,
  InventorySectionStatus,
  VdjRvtrLinkedEntry,
} from "@/lib/ops/intelligence/experience-inspector/types";

type StatusFilter = "all" | "available" | "missing" | "empty" | "error";
type WorkspaceTab = "overview" | "experience" | "research" | "diagnostics";

type Props = {
  inventory: ExperienceInventory | null;
  error: string | null;
  vdjOptions: VdjRvtrLinkedEntry[];
  currentRvtr: string;
  currentVdjPath: string;
  prevRvtr: string | null;
  nextRvtr: string | null;
  /** Server-rendered public experience preview (same loaders as live). */
  publicPreview?: ReactNode;
  publicStatus?: PublicStatusFlag[];
  publicNav?: PublicNavModel | null;
  /** Public chart/subtitle line from loadTrackPage when available. */
  publicSubtitle?: string | null;
};

const TAB_CATEGORY_IDS: Record<WorkspaceTab, readonly string[] | "all"> = {
  overview: "all",
  experience: ["public-experience", "media-visuals", "broadcast-packages"],
  research: ["research-intelligence", "pipeline-production"],
  diagnostics: ["diagnostics", "identity-catalog"],
};

function sectionMatchesFilter(
  section: ExperienceInventorySection,
  filter: StatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "error") return section.status === "error";
  return section.status === filter;
}

function statusLabel(status: InventorySectionStatus | "mixed"): string {
  if (status === "not-applicable") return "N/A";
  if (status === "mixed") return "Mixed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function humanResult(section: ExperienceInventorySection): string {
  if (section.error) return section.error;
  if (section.summary) return section.summary;
  if (typeof section.count === "number") {
    return `${section.count} item${section.count === 1 ? "" : "s"}`;
  }
  if (section.status === "available") return "Available";
  if (section.status === "missing") return "Not found";
  if (section.status === "empty") return "Empty";
  if (section.status === "error") return "Error";
  return "Not applicable";
}

function SectionPanel({ section }: { section: ExperienceInventorySection }) {
  return (
    <article
      className="exp-insp-section"
      data-section-id={section.id}
      data-status={section.status}
    >
      <div className="exp-insp-section__head">
        <h4 className="exp-insp-section__title">{section.label}</h4>
        <span className={`exp-insp-section__status exp-insp-status--${section.status}`}>
          {statusLabel(section.status)}
        </span>
      </div>
      <p className="exp-insp-section__summary">{humanResult(section)}</p>
      <details className="exp-insp-section__details">
        <summary>Details</summary>
        <div className="exp-insp-section__details-body">
          <div className="exp-insp-detail-block">
            <h5>Status</h5>
            <p className={`exp-insp-status--${section.status}`}>{statusLabel(section.status)}</p>
          </div>
          <div className="exp-insp-detail-block">
            <h5>Summary</h5>
            <p>{section.summary ?? humanResult(section)}</p>
          </div>
          <div className="exp-insp-detail-block">
            <h5>Raw Data</h5>
            <pre>
              {JSON.stringify(
                {
                  summary: section.summary ?? null,
                  count: section.count ?? null,
                  error: section.error ?? null,
                },
                null,
                2,
              )}
            </pre>
          </div>
          <div className="exp-insp-detail-block">
            <h5>Technical Source</h5>
            <p>{section.source.subsystem}</p>
            {section.source.loader ? (
              <p className="exp-insp-detail-muted">{section.source.loader}</p>
            ) : null}
          </div>
          <div className="exp-insp-detail-block">
            <h5>Filesystem</h5>
            <p className="exp-insp-detail-path">{section.source.path ?? "—"}</p>
          </div>
          <div className="exp-insp-detail-block">
            <h5>JSON</h5>
            <pre>
              {JSON.stringify(
                {
                  id: section.id,
                  status: section.status,
                  source: section.source,
                  summary: section.summary,
                  count: section.count,
                  error: section.error,
                  data: section.data ?? null,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </details>
    </article>
  );
}

function CategoryCard({
  category,
  open,
  filter,
  onToggle,
}: {
  category: PresentationCategoryView;
  open: boolean;
  filter: StatusFilter;
  onToggle: () => void;
}) {
  const visibleSections = category.sections.filter((section) =>
    sectionMatchesFilter(section, filter),
  );
  const available = category.totals.available;
  const total = category.totals.total;
  const availableSections = category.sections.filter((s) => s.status === "available");
  const gapSections = category.sections.filter(
    (s) => s.status === "missing" || s.status === "empty" || s.status === "error",
  );

  if (filter !== "all" && visibleSections.length === 0) return null;

  return (
    <article
      className={`exp-insp-category${open ? " exp-insp-category--open" : ""}`}
      data-category-id={category.id}
    >
      <button
        type="button"
        className="exp-insp-category__toggle"
        aria-expanded={open}
        onClick={onToggle}
      >
        <div className="exp-insp-category__top">
          <h3 className="exp-insp-category__title">{category.title}</h3>
          <span className="exp-insp-category__ratio">
            {available} / {total} available
          </span>
        </div>
        <div className="exp-insp-category__breakdown">
          {gapSections.length > 0 ? (
            <div className="exp-insp-category__gaps">
              <span className="exp-insp-category__gaps-label">Missing</span>
              <ul aria-label="Missing or incomplete">
                {gapSections.map((section) => (
                  <li key={section.id}>
                    <span aria-hidden>•</span> {section.label}
                    {section.status !== "missing" ? (
                      <span className="exp-insp-category__gap-status">
                        {" "}
                        ({statusLabel(section.status)})
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="exp-insp-category__complete">All tracked sections available</p>
          )}
          {availableSections.length > 0 ? (
            <ul className="exp-insp-category__ok" aria-label="Available">
              {availableSections.map((section) => (
                <li key={section.id}>
                  <span aria-hidden>✓</span> {section.label}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <span className={`exp-insp-category__status exp-insp-status--${category.overallStatus}`}>
          <span className="exp-insp-dot" aria-hidden />
          {statusLabel(category.overallStatus)}
          {filter !== "all" ? ` · showing ${visibleSections.length}` : ""}
        </span>
      </button>
      {open ? (
        <div className="exp-insp-sections" role="region" aria-label={`${category.title} sections`}>
          {visibleSections.map((section) => (
            <SectionPanel key={section.id} section={section} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function ExperienceInspectorPanel({
  inventory,
  error,
  vdjOptions,
  currentRvtr,
  currentVdjPath,
  prevRvtr,
  nextRvtr,
  publicPreview = null,
  publicStatus = [],
  publicNav = null,
  publicSubtitle = null,
}: Props) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set());

  const categories = useMemo(
    () => (inventory ? groupInventorySections(inventory.sections) : []),
    [inventory],
  );

  const workspace = useMemo(
    () => (inventory ? buildOperatorWorkspace(inventory) : null),
    [inventory],
  );

  const visibleCategories = useMemo(() => {
    const ids = TAB_CATEGORY_IDS[tab];
    if (ids === "all") return categories;
    return categories.filter((category) => ids.includes(category.id));
  }, [categories, tab]);

  const totalSections = inventory?.sections.length ?? 0;
  const completenessPct =
    inventory && totalSections > 0
      ? Math.round((inventory.totals.available / totalSections) * 100)
      : null;

  function toggleCategory(id: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setOpenCategories(new Set(visibleCategories.map((c) => c.id)));
  }

  function collapseAll() {
    setOpenCategories(new Set());
  }

  function setFilterFromCard(next: StatusFilter) {
    setFilter((current) => (current === next ? "all" : next));
  }

  return (
    <div className={`exp-insp-app${inventory ? " exp-insp-app--inspected" : ""}`}>
      <header className="exp-insp-header">
        <div>
          <Link className="exp-insp-header__crumb" href="/bobos" prefetch={false}>
            ← BobOS Cockpit
          </Link>
          <div className="exp-insp-header__title-row">
            <h1 className="exp-insp-header__title">RV04-03 Song Workspace</h1>
            <span className="exp-insp-badge">READ ONLY</span>
          </div>
          <p className="exp-insp-header__sub">
            The complete Retroverse workspace for one song.
          </p>
        </div>
      </header>

      <form
        className={`exp-insp-selector${inventory ? " exp-insp-selector--compact" : ""}`}
        method="get"
        action="/bobos/song-workspace"
        aria-label="Song selector"
      >
        <div className="exp-insp-selector__method">
          <span className="exp-insp-selector__label">A · Direct RVTR</span>
          <div className="exp-insp-selector__row">
            <input
              className="exp-insp-input"
              id="rvtr"
              name="rvtr"
              type="text"
              placeholder="RVTR285085"
              defaultValue={currentRvtr}
              autoComplete="off"
              spellCheck={false}
              aria-label="RVTR"
            />
            <button className="exp-insp-btn exp-insp-btn--primary" type="submit">
              Inspect
            </button>
            {prevRvtr ? (
              <Link
                className="exp-insp-btn exp-insp-btn--ghost"
                href={`/bobos/song-workspace?rvtr=${encodeURIComponent(prevRvtr)}`}
                prefetch={false}
              >
                ← Prev
              </Link>
            ) : (
              <button className="exp-insp-btn" type="button" disabled>
                ← Prev
              </button>
            )}
            {nextRvtr ? (
              <Link
                className="exp-insp-btn exp-insp-btn--ghost"
                href={`/bobos/song-workspace?rvtr=${encodeURIComponent(nextRvtr)}`}
                prefetch={false}
              >
                Next →
              </Link>
            ) : (
              <button className="exp-insp-btn" type="button" disabled>
                Next →
              </button>
            )}
          </div>
        </div>

        <div className="exp-insp-selector__method">
          <span className="exp-insp-selector__label">B · VirtualDJ</span>
          <div className="exp-insp-selector__row">
            <select
              className="exp-insp-select"
              id="vdj"
              name="vdj"
              defaultValue={currentVdjPath}
              aria-label="VirtualDJ track with Label RVTR"
            >
              <option value="">Select track with attached Label RVTR</option>
              {vdjOptions.map((entry) => (
                <option key={`${entry.rvtr}:${entry.filePath}`} value={entry.filePath}>
                  [{entry.rvtr}] {entry.artist} — {entry.title}
                  {entry.playCount != null ? ` (${entry.playCount})` : ""}
                </option>
              ))}
            </select>
          </div>
          <p className="exp-insp-selector__rule">RVTR only. No title or artist matching.</p>
        </div>
      </form>

      {error ? <div className="exp-insp-error">{error}</div> : null}

      {!inventory && !error ? (
        <div className="exp-insp-empty-state">
          Enter an RVTR or choose a VirtualDJ track, then click Inspect.
        </div>
      ) : null}

      {inventory && workspace ? (
        <>
          <nav className="exp-insp-tabs" aria-label="Workspace">
            {(
              [
                ["overview", "Overview"],
                ["experience", "Experience"],
                ["research", "Research"],
                ["diagnostics", "Diagnostics"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`exp-insp-tab${tab === id ? " exp-insp-tab--active" : ""}`}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => {
                  setTab(id);
                  if (id === "overview") collapseAll();
                }}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "overview" ? (
            <div className="exp-insp-overview exp-insp-overview--public-first">
              <section className="exp-insp-identity" aria-label="Song identity">
                {inventory.identity.artworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="exp-insp-identity__art"
                    src={inventory.identity.artworkUrl}
                    alt=""
                  />
                ) : (
                  <div className="exp-insp-identity__art-empty">No artwork</div>
                )}
                <div className="exp-insp-identity__body">
                  <h2 className="exp-insp-identity__song">
                    {inventory.identity.title ?? "Untitled"}
                  </h2>
                  <p className="exp-insp-identity__artist">
                    {inventory.identity.artist ?? "Unknown artist"}
                  </p>
                  {publicSubtitle ? (
                    <p className="exp-insp-identity__subtitle">{publicSubtitle}</p>
                  ) : null}
                  <dl className="exp-insp-identity__meta">
                    <div>
                      <dt>Album</dt>
                      <dd>{inventory.identity.album ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Year</dt>
                      <dd>{inventory.identity.year ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>RVTR</dt>
                      <dd>{inventory.rvtr}</dd>
                    </div>
                  </dl>
                  {publicStatus.length > 0 ? (
                    <ul className="sw-public-status" aria-label="Public status">
                      {publicStatus.map((flag) => (
                        <li
                          key={flag.id}
                          className={`sw-public-status__item${
                            flag.ready ? " sw-public-status__item--ready" : ""
                          }`}
                          title={flag.explanation}
                        >
                          <span aria-hidden>{flag.ready ? "●" : "○"}</span> {flag.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {publicNav ? (
                    <nav className="sw-public-nav" aria-label="Open public pages">
                      {publicNav.links.map((link) =>
                        link.href ? (
                          <a
                            key={link.id}
                            className="exp-insp-btn exp-insp-btn--ghost sw-public-nav__btn"
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <button
                            key={link.id}
                            type="button"
                            className="exp-insp-btn sw-public-nav__btn"
                            disabled
                          >
                            {link.label}
                          </button>
                        ),
                      )}
                    </nav>
                  ) : null}
                </div>
              </section>

              <section
                className="sw-public-slot"
                aria-label="Public experience preview"
                data-panel="public-preview"
              >
                {publicPreview}
              </section>

              <aside className="exp-insp-workspace-rail" aria-label="Workspace operations">
                <section
                  className="exp-insp-health"
                  aria-label="Experience health"
                  data-panel="health"
                >
                  <h2 className="exp-insp-panel-title">Experience Health</h2>
                  <ul className="exp-insp-health__list">
                    {workspace.health.map((item) => (
                      <li
                        key={item.id}
                        className={`exp-insp-health__item exp-insp-health__item--${item.tone}`}
                        title={item.explanation}
                      >
                        <span className="exp-insp-health__mark" aria-hidden>
                          ●
                        </span>
                        <span className="exp-insp-health__label">{item.label}</span>
                        <span className="exp-insp-sr-only">{item.explanation}</span>
                      </li>
                    ))}
                  </ul>
                  <details className="exp-insp-health__details">
                    <summary>Why these statuses</summary>
                    <ul>
                      {workspace.health.map((item) => (
                        <li key={`${item.id}-why`}>
                          <strong>{item.label}:</strong> {item.explanation}
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>

                <section
                  className="exp-insp-actions"
                  aria-label="Next recommended actions"
                  data-panel="actions"
                >
                  <h2 className="exp-insp-panel-title">Next Recommended Actions</h2>
                  {workspace.actions.length === 0 ? (
                    <p className="exp-insp-actions__empty">
                      No recommended actions — tracked assets look complete.
                    </p>
                  ) : (
                    <ol className="exp-insp-actions__list">
                      {workspace.actions.map((action, index) => (
                        <li key={action.id} className="exp-insp-actions__item">
                          <span className="exp-insp-actions__num" aria-hidden>
                            {index + 1}
                          </span>
                          <div>
                            <div className="exp-insp-actions__label">{action.label}</div>
                            <div className="exp-insp-actions__reason">{action.reason}</div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <aside className="exp-insp-tools" aria-label="Future tools" data-panel="tools">
                  <h2 className="exp-insp-panel-title">Tools</h2>
                  <p className="exp-insp-tools__note">Coming soon for this RVTR</p>
                  <ul className="exp-insp-tools__list">
                    {FUTURE_TOOLS.map((tool) => (
                      <li key={tool.id}>
                        <button type="button" className="exp-insp-tool" disabled>
                          {tool.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </aside>

                <section className="exp-insp-overview-stats" aria-label="Experience summary">
                  <div className="exp-insp-summary">
                    {(
                      [
                        ["available", inventory.totals.available, "Available"],
                        ["missing", inventory.totals.missing, "Missing"],
                        ["empty", inventory.totals.empty, "Empty"],
                        ["error", inventory.totals.errors, "Errors"],
                      ] as const
                    ).map(([key, value, label]) => (
                      <button
                        key={key}
                        type="button"
                        className={`exp-insp-stat exp-insp-stat--${
                          key === "error" ? "errors" : key
                        }${filter === key ? " exp-insp-stat--active" : ""}`}
                        aria-pressed={filter === key}
                        onClick={() => setFilterFromCard(key)}
                      >
                        <span className="exp-insp-stat__num">{value}</span>
                        <span className="exp-insp-stat__label">{label}</span>
                      </button>
                    ))}
                  </div>
                  {completenessPct != null ? (
                    <p className="exp-insp-completeness">
                      Completeness: <strong>{completenessPct}%</strong> available of{" "}
                      {totalSections} sections
                    </p>
                  ) : null}
                </section>
              </aside>
            </div>
          ) : null}

          {tab !== "overview" || openCategories.size > 0 ? (
            <div className="exp-insp-sticky" aria-label="Inspection context">
              <div className="exp-insp-sticky__song">
                {inventory.identity.title ?? "Untitled"} · {inventory.rvtr}
              </div>
              <div className="exp-insp-sticky__counts" aria-label="Inventory totals">
                <span>{inventory.totals.available} available</span>
                <span>{inventory.totals.missing} missing</span>
                <span>{inventory.totals.empty} empty</span>
                <span>{inventory.totals.errors} errors</span>
              </div>
              <button
                type="button"
                className="exp-insp-btn exp-insp-btn--ghost"
                onClick={() => {
                  setTab("overview");
                  collapseAll();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Back to overview
              </button>
            </div>
          ) : null}

          {tab !== "overview" ? (
            <div className="exp-insp-toolbar">
              <div className="exp-insp-filters" role="group" aria-label="Status filter">
                {(
                  [
                    ["all", "All"],
                    ["available", "Available"],
                    ["missing", "Missing"],
                    ["empty", "Empty"],
                    ["error", "Errors"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`exp-insp-chip${filter === key ? " exp-insp-chip--active" : ""}`}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="exp-insp-toolbar__actions">
                <button type="button" className="exp-insp-btn exp-insp-btn--ghost" onClick={expandAll}>
                  Expand all
                </button>
                <button
                  type="button"
                  className="exp-insp-btn exp-insp-btn--ghost"
                  onClick={collapseAll}
                >
                  Collapse all
                </button>
              </div>
            </div>
          ) : (
            <div className="exp-insp-toolbar exp-insp-toolbar--overview">
              <h2 className="exp-insp-panel-title exp-insp-panel-title--inline">
                Experience Areas
              </h2>
              <div className="exp-insp-filters" role="group" aria-label="Status filter">
                {(
                  [
                    ["all", "All"],
                    ["available", "Available"],
                    ["missing", "Missing"],
                    ["empty", "Empty"],
                    ["error", "Errors"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`exp-insp-chip${filter === key ? " exp-insp-chip--active" : ""}`}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="exp-insp-toolbar__actions">
                <button type="button" className="exp-insp-btn exp-insp-btn--ghost" onClick={expandAll}>
                  Expand all
                </button>
                <button
                  type="button"
                  className="exp-insp-btn exp-insp-btn--ghost"
                  onClick={collapseAll}
                >
                  Collapse all
                </button>
              </div>
            </div>
          )}

          <section
            className="exp-insp-categories"
            aria-label={tab === "overview" ? "Experience areas" : `${tab} experience areas`}
          >
            {visibleCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                open={openCategories.has(category.id)}
                filter={filter}
                onToggle={() => toggleCategory(category.id)}
              />
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
