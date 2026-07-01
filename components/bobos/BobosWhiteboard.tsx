"use client";

import { useCallback, useMemo, useState } from "react";

import { BLUEPRINT_TEMPLATE_LABELS } from "@/lib/bobos/blueprint-template";
import {
  ARCHITECTURE_TREE,
  BLUEPRINTS,
  DEFAULT_SELECTED_ID,
  PAGE_DECISIONS,
  SPRINT_1_DELIVERABLES,
  STATUS_LABELS,
  WHITEBOARD_META,
  type PageStatus,
  type TreeItem,
} from "@/lib/bobos/whiteboard-data";

const STATUS_CYCLE: PageStatus[] = [
  "not-started",
  "designing",
  "approved",
  "building",
  "production",
  "retired",
];

function nextStatus(current: PageStatus): PageStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] ?? "not-started";
}

function StatusPill({
  status,
  onClick,
  interactive,
}: {
  status: PageStatus;
  onClick?: (e: React.MouseEvent) => void;
  interactive?: boolean;
}) {
  const Tag = interactive ? "button" : "span";
  return (
    <Tag
      type={interactive ? "button" : undefined}
      className={`bobos-status bobos-status--${status}${interactive ? " bobos-status--clickable" : ""}`}
      onClick={onClick}
      title={interactive ? "Click to cycle status (not saved)" : undefined}
    >
      {STATUS_LABELS[status]}
    </Tag>
  );
}

function BlueprintListSection({
  label,
  items,
  ordered,
}: {
  label: string;
  items: string[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";
  return (
    <section className="bobos-blueprint__section">
      <h3 className="bobos-blueprint__label">{label}</h3>
      <ListTag
        className={`bobos-blueprint__list${ordered ? " bobos-blueprint__list--ordered" : ""}`}
      >
        {items.map((item, i) => (
          <li key={`${label}-${item}`}>
            {ordered ? (
              <>
                <span className="bobos-blueprint__rank">{i + 1}.</span> {item}
              </>
            ) : (
              item
            )}
          </li>
        ))}
      </ListTag>
    </section>
  );
}

function BlueprintPanel({ pageId }: { pageId: string }) {
  const blueprint = BLUEPRINTS[pageId];
  if (!blueprint) return null;

  return (
    <div className="bobos-blueprint">
      <div className="bobos-blueprint__header">
        <h2 className="bobos-blueprint__title">{blueprint.title}</h2>
        <StatusPill status={blueprint.status} />
      </div>

      <section className="bobos-blueprint__section">
        <h3 className="bobos-blueprint__label">
          {BLUEPRINT_TEMPLATE_LABELS.purpose}
        </h3>
        <p className="bobos-blueprint__text">{blueprint.purpose}</p>
      </section>

      <section className="bobos-blueprint__section">
        <h3 className="bobos-blueprint__label">
          {BLUEPRINT_TEMPLATE_LABELS.primaryUser}
        </h3>
        <p className="bobos-blueprint__text">{blueprint.primaryUser}</p>
      </section>

      <BlueprintListSection
        label={BLUEPRINT_TEMPLATE_LABELS.mustAlwaysDo}
        items={blueprint.mustAlwaysDo}
      />

      <BlueprintListSection
        label={BLUEPRINT_TEMPLATE_LABELS.navigationIn}
        items={blueprint.navigationIn}
      />

      <BlueprintListSection
        label={BLUEPRINT_TEMPLATE_LABELS.navigationOut}
        items={blueprint.navigationOut}
      />

      {blueprint.displayPriority ? (
        <BlueprintListSection
          label={BLUEPRINT_TEMPLATE_LABELS.displayPriority}
          items={blueprint.displayPriority}
          ordered
        />
      ) : null}

      {blueprint.liveTrigger ? (
        <section className="bobos-blueprint__section">
          <h3 className="bobos-blueprint__label">
            {BLUEPRINT_TEMPLATE_LABELS.liveTrigger}
          </h3>
          <p className="bobos-blueprint__text">{blueprint.liveTrigger}</p>
        </section>
      ) : null}

      {blueprint.override ? (
        <section className="bobos-blueprint__section">
          <h3 className="bobos-blueprint__label">
            {BLUEPRINT_TEMPLATE_LABELS.override}
          </h3>
          <p className="bobos-blueprint__text">{blueprint.override}</p>
        </section>
      ) : null}

      {blueprint.notes ? (
        <BlueprintListSection
          label={BLUEPRINT_TEMPLATE_LABELS.notes}
          items={blueprint.notes}
        />
      ) : null}

      <section className="bobos-blueprint__section">
        <h3 className="bobos-blueprint__label">
          {BLUEPRINT_TEMPLATE_LABELS.status}
        </h3>
        <StatusPill status={blueprint.status} />
      </section>
    </div>
  );
}

function DecisionsPanel({ pageId }: { pageId: string }) {
  const decisions = PAGE_DECISIONS[pageId];

  if (!decisions) {
    return (
      <div className="bobos-decisions bobos-decisions--empty">
        <p className="bobos-decisions__placeholder">
          No decisions recorded yet for this page.
        </p>
      </div>
    );
  }

  return (
    <div className="bobos-decisions">
      <section className="bobos-decisions__section">
        <h3 className="bobos-decisions__heading bobos-decisions__heading--approved">
          Approved
        </h3>
        <ul className="bobos-decisions__list">
          {decisions.approved.map((item) => (
            <li
              key={item}
              className="bobos-decisions__item bobos-decisions__item--approved"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {decisions.pending.length > 0 ? (
        <section className="bobos-decisions__section">
          <h3 className="bobos-decisions__heading bobos-decisions__heading--pending">
            Pending
          </h3>
          <ul className="bobos-decisions__list">
            {decisions.pending.map((item) => (
              <li
                key={item}
                className="bobos-decisions__item bobos-decisions__item--pending"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="bobos-decisions__approval">
        <label
          className={`bobos-decisions__checkbox${decisions.isApproved ? " bobos-decisions__checkbox--checked" : ""}`}
        >
          <input type="checkbox" checked={decisions.isApproved} disabled readOnly />
          <span className="bobos-decisions__checkbox-box" aria-hidden />
          <span>{decisions.approvalLabel}</span>
        </label>
      </div>
    </div>
  );
}

export function BobosWhiteboard() {
  const [selectedId, setSelectedId] = useState(DEFAULT_SELECTED_ID);
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, PageStatus>
  >({});

  const treeWithOverrides = useMemo(() => {
    return ARCHITECTURE_TREE.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      })),
    }));
  }, [statusOverrides]);

  const cycleItemStatus = useCallback((item: TreeItem) => {
    setStatusOverrides((prev) => ({
      ...prev,
      [item.id]: nextStatus(prev[item.id] ?? item.status),
    }));
  }, []);

  return (
    <div className="bobos-whiteboard">
      <header className="bobos-header">
        <div className="bobos-header__top">
          <h1 className="bobos-header__title">{WHITEBOARD_META.title}</h1>
          <p className="bobos-header__subtitle">{WHITEBOARD_META.subtitle}</p>
        </div>
        <dl className="bobos-header__meta">
          <div className="bobos-header__meta-row">
            <dt>Current Product</dt>
            <dd>{WHITEBOARD_META.currentProduct}</dd>
          </div>
          <div className="bobos-header__meta-row">
            <dt>Current Sprint</dt>
            <dd>{WHITEBOARD_META.currentSprint}</dd>
          </div>
          <div className="bobos-header__meta-row">
            <dt>Sprint Status</dt>
            <dd className="bobos-header__sprint-complete">
              {WHITEBOARD_META.sprintStatus}
            </dd>
          </div>
          <div className="bobos-header__meta-row bobos-header__meta-row--highlight">
            <dt>Next Milestone</dt>
            <dd>{WHITEBOARD_META.nextMilestone}</dd>
          </div>
        </dl>

        <section className="bobos-deliverables" aria-label="Sprint 1 deliverables">
          <h2 className="bobos-deliverables__title">Sprint 1 Deliverables</h2>
          <ul className="bobos-deliverables__list">
            {SPRINT_1_DELIVERABLES.map((item) => (
              <li
                key={item.label}
                className={`bobos-deliverables__item${item.done ? " bobos-deliverables__item--done" : ""}`}
              >
                <span className="bobos-deliverables__mark" aria-hidden>
                  {item.done ? "✓" : "○"}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>
      </header>

      <div className="bobos-panels">
        <aside className="bobos-panel bobos-panel--tree">
          <h2 className="bobos-panel__title">Architecture Tree</h2>
          <nav className="bobos-tree" aria-label="Architecture tree">
            {treeWithOverrides.map((section) => (
              <div key={section.label} className="bobos-tree__section">
                <h3 className="bobos-tree__section-label">{section.label}</h3>
                <ul className="bobos-tree__list">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <div
                        className={`bobos-tree__item${selectedId === item.id ? " bobos-tree__item--selected" : ""}`}
                      >
                        <button
                          type="button"
                          className="bobos-tree__item-select"
                          onClick={() => setSelectedId(item.id)}
                        >
                          {item.label}
                        </button>
                        <StatusPill
                          status={item.status}
                          interactive
                          onClick={() => cycleItemStatus(item)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="bobos-panel bobos-panel--blueprint">
          <h2 className="bobos-panel__title">Selected Page Blueprint</h2>
          <BlueprintPanel pageId={selectedId} />
        </main>

        <aside className="bobos-panel bobos-panel--decisions">
          <h2 className="bobos-panel__title">Decisions</h2>
          <DecisionsPanel pageId={selectedId} />
        </aside>
      </div>
    </div>
  );
}
