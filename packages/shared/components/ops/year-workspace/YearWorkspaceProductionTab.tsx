"use client";

import { useMemo, useState } from "react";

import { YearWorkspaceDropZone } from "@/components/ops/year-workspace/YearWorkspaceDropZone";
import type {
  CategoryProductionFile,
  ProductionItem,
  ProductionSection,
  ProductionWorkflowAction,
} from "@/lib/ops/year-workspace/production-types";
import { itemsInSection } from "@/lib/ops/year-workspace/production-utils";
import type { YearWorkspaceCategoryId } from "@/lib/ops/year-workspace/types";
import { YEAR_WORKSPACE_PANEL_PREVIEW } from "@/lib/ops/year-workspace/types";

const SECTIONS: { id: ProductionSection; label: string; subtitle: string }[] = [
  { id: "wanted", label: "Wanted", subtitle: "Recommendations and targets" },
  {
    id: "queued",
    label: "Acquisition Queue",
    subtitle: "Source selected — attach asset, then acquire",
  },
  { id: "acquired", label: "Acquired", subtitle: "In library — needs review or approval" },
  { id: "approved", label: "Approved", subtitle: "Ready for the show" },
];

function ProductionItemRow(props: {
  item: ProductionItem;
  section: ProductionSection;
  busy: boolean;
  onAction: (itemId: string, action: ProductionWorkflowAction) => void;
  onFindSources?: (item: ProductionItem) => void;
}) {
  const { item } = props;
  const isQueue = item.kind === "queue_entry";
  const hasAsset = Boolean(item.attachedFilename);

  const actions: { action: ProductionWorkflowAction; label: string }[] =
    props.section === "wanted" && item.kind === "recommendation"
      ? [
          { action: "acquire", label: "Acquire" },
          { action: "skip", label: "Skip" },
          { action: "approve", label: "Approve" },
        ]
      : props.section === "queued" || props.section === "acquired"
        ? [
            { action: "acquire", label: "Acquire" },
            { action: "approve", label: "Approve" },
          ]
        : props.section === "wanted" && item.kind === "asset"
          ? [
              { action: "acquire", label: "Acquire" },
              { action: "skip", label: "Skip" },
            ]
          : [];

  return (
    <li className="ops-yw-prod-item">
      <div className="ops-yw-prod-item__main">
        <span className="ops-yw-prod-item__title">
          {item.title}
          {hasAsset ? (
            <span className="ops-yw-prod-item__attached">Asset Attached ✓</span>
          ) : null}
        </span>
        {item.kind === "recommendation" && item.description ? (
          <span className="ops-dim ops-yw-prod-item__desc">{item.description}</span>
        ) : item.subtitle ? (
          <span className="ops-dim ops-yw-prod-item__sub">{item.subtitle}</span>
        ) : null}
        {isQueue ? (
          <span className="ops-yw-prod-item__meta">
            <span className="ops-mono">{item.sourceType}</span>
            {item.sourceUrl ? (
              <>
                {" "}
                ·{" "}
                <a href={item.sourceUrl} target="_blank" rel="noreferrer noopener">
                  source
                </a>
              </>
            ) : null}
            {item.dateAdded ? <> · {item.dateAdded.slice(0, 10)}</> : null}
          </span>
        ) : null}
        {item.kind === "recommendation" ? (
          <span className="ops-yw-prod-item__meta">
            {item.year ?? "—"}
            {item.sourceCategory ? (
              <>
                {" "}
                · <span className="ops-mono">{item.sourceCategory}</span>
              </>
            ) : null}
            {item.priority != null ? <> · P{item.priority}</> : null} · {item.status}
          </span>
        ) : null}
        {hasAsset ? (
          <span className="ops-mono ops-yw-prod-item__meta">
            {item.attachedFilename} · {item.attachedFilepath}
          </span>
        ) : null}
        {item.kind === "asset" && !isQueue ? (
          <span className="ops-yw-prod-item__meta ops-mono">
            {item.filename} · {item.dateAdded?.slice(0, 10) ?? "—"}
          </span>
        ) : null}
      </div>
      <span className="ops-yw-actions">
        {props.section === "wanted" &&
        item.kind === "recommendation" &&
        props.onFindSources ? (
          <button
            type="button"
            className="ops-yw-action ops-yw-action--find"
            disabled={props.busy}
            onClick={() => props.onFindSources?.(item)}
          >
            Find Sources
          </button>
        ) : null}
        {actions.map(({ action, label }) => (
          <button
            key={action}
            type="button"
            className={`ops-yw-action${
              item.workflowAction === action ? " ops-yw-action--on" : ""
            }`}
            disabled={props.busy}
            onClick={() => props.onAction(item.id, action)}
          >
            {label}
          </button>
        ))}
      </span>
    </li>
  );
}

function ProductionSectionPanel(props: {
  section: ProductionSection;
  label: string;
  subtitle: string;
  items: ProductionItem[];
  busyItemId: string | null;
  onAction: (itemId: string, action: ProductionWorkflowAction) => void;
  onFindSources?: (item: ProductionItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = props.items.length;
  const visible = expanded ? props.items : props.items.slice(0, YEAR_WORKSPACE_PANEL_PREVIEW);
  const hidden = total - YEAR_WORKSPACE_PANEL_PREVIEW;

  return (
    <section className="ops-yw-panel" aria-labelledby={`yw-prod-${props.section}`}>
      <header className="ops-yw-panel__head">
        <h3 id={`yw-prod-${props.section}`} className="ops-yw-panel__title">
          {props.label}
          <span className="ops-yw-panel__count">{total}</span>
        </h3>
        <p className="ops-dim ops-yw-panel__subtitle">{props.subtitle}</p>
      </header>
      {total === 0 ? (
        <p className="ops-empty ops-yw-panel__empty">None yet.</p>
      ) : (
        <>
          <ul className="ops-yw-prod-list">
            {visible.map((item) => (
              <ProductionItemRow
                key={item.id}
                item={item}
                section={props.section}
                busy={props.busyItemId === item.id}
                onAction={props.onAction}
                onFindSources={
                  props.section === "wanted" ? props.onFindSources : undefined
                }
              />
            ))}
          </ul>
          {!expanded && hidden > 0 ? (
            <button
              type="button"
              className="ops-yw-panel__more"
              onClick={() => setExpanded(true)}
            >
              Show all {total}
            </button>
          ) : expanded && total > YEAR_WORKSPACE_PANEL_PREVIEW ? (
            <button
              type="button"
              className="ops-yw-panel__more"
              onClick={() => setExpanded(false)}
            >
              Show first {YEAR_WORKSPACE_PANEL_PREVIEW}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export function YearWorkspaceProductionTab(props: {
  year: number;
  category: YearWorkspaceCategoryId;
  categoryLabel: string;
  file: CategoryProductionFile;
  busyItemId: string | null;
  generating: boolean;
  poolRemaining: number | null;
  poolTotal: number | null;
  attachQueueItemId: string | null;
  onAttachQueueItemChange: (id: string | null) => void;
  onGenerate: () => void;
  onGenerateMore: () => void;
  onItemAction: (itemId: string, action: ProductionWorkflowAction) => void;
  onFindSources: (item: ProductionItem) => void;
  onDropFilenames: (filenames: string[], queueItemId?: string | null) => void;
}) {
  const sections = useMemo(
    () =>
      SECTIONS.map((s) => ({
        ...s,
        items: itemsInSection(props.file, s.id),
      })),
    [props.file],
  );

  const queueItems = useMemo(
    () => props.file.items.filter((i) => i.kind === "queue_entry" && !i.skipped),
    [props.file],
  );

  const showGenerate = props.category !== "songs";

  return (
    <div className="ops-yw-production">
      <header className="ops-yw-production__toolbar">
        <p className="ops-yw-production__intro">
          Production workspace — <strong>{props.categoryLabel}</strong> for {props.year}.
          Find sources → queue → attach asset → acquire → approve.
        </p>
        {showGenerate ? (
          <span className="ops-yw-production__gen-btns">
            <button
              type="button"
              className="ops-btn ops-btn--ok"
              disabled={props.generating}
              onClick={props.onGenerate}
            >
              {props.generating ? "Generating…" : "Generate Recommendations"}
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={props.generating || props.poolRemaining === 0}
              onClick={props.onGenerateMore}
            >
              Generate More
            </button>
            {props.poolTotal != null ? (
              <span className="ops-dim ops-yw-production__pool">
                Curated pool: {props.poolTotal}
                {props.poolRemaining != null ? ` · ${props.poolRemaining} left` : null}
              </span>
            ) : null}
          </span>
        ) : null}
      </header>

      <YearWorkspaceDropZone
        categoryLabel={props.categoryLabel}
        queueItems={queueItems}
        attachQueueItemId={props.attachQueueItemId}
        onAttachQueueItemChange={props.onAttachQueueItemChange}
        onDropFilenames={props.onDropFilenames}
      />

      <div className="ops-yw-panels">
        {sections.map((s) => (
          <ProductionSectionPanel
            key={s.id}
            section={s.id}
            label={s.label}
            subtitle={s.subtitle}
            items={s.items}
            busyItemId={props.busyItemId}
            onAction={props.onItemAction}
            onFindSources={props.onFindSources}
          />
        ))}
      </div>
    </div>
  );
}
