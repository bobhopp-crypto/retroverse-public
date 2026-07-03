"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { PRODUCER_BLOCK_TEMPLATES } from "@/lib/ops/year-workspace/producer/block-templates";
import { producerCountsForCategory } from "@/lib/ops/year-workspace/producer/counts";
import { buildProducerLibraryAssets } from "@/lib/ops/year-workspace/producer/assets";
import {
  buildEraBalanceRows,
  buildEraBreakdown,
} from "@/lib/ops/year-workspace/producer/era-balance";
import { eraDisplayLabel, PRODUCER_ERA_IDS } from "@/lib/ops/year-workspace/producer/era";
import { buildZonePlacements, planningRulerTicks } from "@/lib/ops/year-workspace/producer/planning-grid";
import {
  PRODUCER_ASSET_CATEGORIES,
  PRODUCER_DASHBOARD_CATEGORIES,
  producerCategoryLabel,
} from "@/lib/ops/year-workspace/producer/config";
import {
  computeBlockRuntimes,
  computeShowRuntimeSeconds,
  effectiveRuntimeSeconds,
  formatProducerDuration,
  formatProducerMmSs,
  isAssetRuntimeApproved,
  parseProducerMmSs,
  showRuntimeSummary,
  sumBlockRuntimeSeconds,
} from "@/lib/ops/year-workspace/producer/runtime";
import { showRuntimeHealth } from "@/lib/ops/year-workspace/producer/show-health";
import type {
  ProducerAssetCategoryId,
  ProducerBlockTemplateId,
  ProducerEraId,
  ProducerLibraryAsset,
  ProducerNeedFoundReady,
  ProducerShowBlock,
  ProducerTimelineAsset,
  ProducerTimelineState,
} from "@/lib/ops/year-workspace/producer/types";
import type {
  YearWorkspaceProductionState,
  YearWorkspaceProductionSummary,
} from "@/lib/ops/year-workspace/production-types";
import type { YearWorkspaceData } from "@/lib/ops/year-workspace/types";

const DRAG_MIME = "application/x-retroverse-producer-asset";

type Props = {
  year: number;
  workspace: YearWorkspaceData | null;
  production: YearWorkspaceProductionState | null;
  summary: YearWorkspaceProductionSummary | null;
  timeline: ProducerTimelineState;
  busy: boolean;
  onPatchTimeline: (body: Record<string, unknown>) => Promise<void>;
};

function CountsCompact(props: { counts: ProducerNeedFoundReady }) {
  const { counts } = props;
  return (
    <span className="ops-producer-counts-compact">
      <span>N {counts.need}</span>
      <span>F {counts.found}</span>
      <span>R {counts.ready}</span>
      {counts.missing > 0 ? (
        <span className="ops-producer-counts-compact__miss">−{counts.missing}</span>
      ) : null}
    </span>
  );
}

function RuntimeDotsRow(props: { label: string; seconds: number }) {
  return (
    <div className="ops-producer-runtime-row">
      <span className="ops-producer-runtime-row__label">{props.label}</span>
      <span className="ops-producer-runtime-row__dots" aria-hidden />
      <span className="ops-producer-runtime-row__time">
        {formatProducerDuration(props.seconds)}
      </span>
    </div>
  );
}

function BlockEraHeader(props: {
  eraId: ProducerEraId;
  title: string;
  seconds: number;
}) {
  return (
    <div className={`ops-producer-block__header ops-producer-era--${props.eraId}`}>
      <span className="ops-producer-block__era-badge">[{eraDisplayLabel(props.eraId)}]</span>
      <span className="ops-producer-block__header-title">{props.title}</span>
      <span className="ops-producer-block__header-dots" aria-hidden />
      <span className="ops-producer-block__header-time">
        {formatProducerDuration(props.seconds)}
      </span>
    </div>
  );
}

function assetDragPayload(asset: ProducerLibraryAsset): string {
  return JSON.stringify({
    producerCategory: asset.producerCategory,
    productionCategory: asset.productionCategory,
    productionItemId: asset.productionItemId,
    title: asset.title,
    subtitle: asset.subtitle,
    runtimeSeconds: asset.runtimeSeconds,
  });
}

function parseDragPayload(
  raw: string,
): Omit<ProducerLibraryAsset, "id" | "status"> | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.producerCategory !== "string") return null;
    if (typeof o.productionCategory !== "string") return null;
    if (typeof o.productionItemId !== "string") return null;
    if (typeof o.title !== "string") return null;
    const runtimeSeconds =
      typeof o.runtimeSeconds === "number" && Number.isFinite(o.runtimeSeconds)
        ? o.runtimeSeconds
        : 60;
    return {
      producerCategory: o.producerCategory as ProducerAssetCategoryId,
      productionCategory: o.productionCategory as ProducerLibraryAsset["productionCategory"],
      productionItemId: o.productionItemId,
      title: o.title,
      subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
      runtimeSeconds,
    };
  } catch {
    return null;
  }
}

function TimelineAssetRow(props: {
  item: ProducerTimelineAsset;
  busy: boolean;
  onRemove: () => void;
  onSetOverride: (seconds: number) => void;
  onClearOverride: () => void;
  onToggleApproval: (approved: boolean) => void;
}) {
  const { item } = props;
  const effective = effectiveRuntimeSeconds(item);
  const approved = isAssetRuntimeApproved(item);
  const hasOverride =
    item.runtimeOverrideSeconds != null &&
    Number.isFinite(item.runtimeOverrideSeconds);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() =>
    formatProducerMmSs(hasOverride ? item.runtimeOverrideSeconds! : effective),
  );

  function openEdit() {
    setDraft(
      formatProducerMmSs(hasOverride ? item.runtimeOverrideSeconds! : effective),
    );
    setEditing(true);
  }

  async function saveEdit() {
    const parsed = parseProducerMmSs(draft);
    if (parsed == null) return;
    setEditing(false);
    await props.onSetOverride(parsed);
  }

  return (
    <li className="ops-producer-block__item">
      <div className="ops-producer-block__item-main">
        <span className="ops-producer-block__item-cat">
          {producerCategoryLabel(item.producerCategory)}
        </span>
        <span className="ops-producer-block__item-title">{item.title}</span>
        {item.subtitle ? (
          <span className="ops-dim ops-producer-block__item-sub">{item.subtitle}</span>
        ) : null}
        <div className="ops-producer-block__item-runtime">
          <span className="ops-producer-block__item-runtime-label">Runtime:</span>
          <span className="ops-producer-block__item-runtime-used">
            {formatProducerDuration(effective)}
          </span>
          <span className="ops-dim">src {formatProducerDuration(item.runtimeSeconds)}</span>
          {hasOverride ? (
            <span className="ops-producer-block__item-runtime-ovr">override</span>
          ) : null}
        </div>
        <div
          className={`ops-producer-runtime-status${
            approved ? " ops-producer-runtime-status--ok" : " ops-producer-runtime-status--warn"
          }`}
        >
          <span className="ops-producer-runtime-status__icon" aria-hidden>
            {approved ? "✓" : "⚠"}
          </span>
          <span>{approved ? "Approved" : "Estimated"}</span>
        </div>
        <label className="ops-producer-approve">
          <input
            type="checkbox"
            checked={approved}
            disabled={props.busy}
            onChange={(e) => void props.onToggleApproval(e.target.checked)}
          />
          <span>Approved time ✓</span>
        </label>
        {editing ? (
          <div className="ops-producer-block__item-edit">
            <input
              type="text"
              className="ops-producer-runtime-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="M:SS"
              disabled={props.busy}
              aria-label="Runtime override"
            />
            <button
              type="button"
              className="ops-btn ops-btn--info"
              disabled={props.busy}
              onClick={() => void saveEdit()}
            >
              Save
            </button>
            <button
              type="button"
              className="ops-btn ops-btn--ghost"
              disabled={props.busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="ops-producer-block__item-actions">
            <button
              type="button"
              className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
              disabled={props.busy}
              onClick={openEdit}
            >
              Edit
            </button>
            {hasOverride ? (
              <button
                type="button"
                className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
                disabled={props.busy}
                onClick={() => void props.onClearOverride()}
              >
                Reset
              </button>
            ) : null}
          </div>
        )}
      </div>
      <button
        type="button"
        className="ops-btn ops-btn--ghost ops-producer-block__remove"
        disabled={props.busy}
        onClick={props.onRemove}
      >
        Remove
      </button>
    </li>
  );
}

function ShowBlockCard(props: {
  block: ProducerShowBlock;
  blockSeconds: number;
  dragOver: boolean;
  busy: boolean;
  isFirst: boolean;
  isLast: boolean;
  onPatch: (body: Record<string, unknown>) => Promise<void>;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const { block } = props;
  const [notesDraft, setNotesDraft] = useState(block.notes ?? "");
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    setNotesDraft(block.notes ?? "");
  }, [block.notes]);

  async function patch(body: Record<string, unknown>) {
    await props.onPatch(body);
  }

  function confirmDelete() {
    const n = block.assets.length;
    const msg =
      n > 0
        ? `Delete block "${block.title}"?\n\nThis removes ${n} asset(s) from the rundown. Library items are unchanged.`
        : `Delete block "${block.title}"?`;
    if (!window.confirm(msg)) return;
    void patch({ op: "producerDeleteBlock", blockId: block.id });
  }

  function renameBlock() {
    const next = window.prompt("Block name", block.title);
    if (next == null || !next.trim()) return;
    void patch({ op: "producerRenameBlock", blockId: block.id, title: next.trim() });
  }

  async function addFromTemplate(templateId: ProducerBlockTemplateId) {
    setShowAddMenu(false);
    await patch({
      op: "producerAddBlock",
      afterBlockId: block.id,
      templateId,
    });
  }

  return (
    <article
      className={`ops-producer-block ops-producer-era--${block.eraId}${
        props.dragOver ? " ops-producer-block--over" : ""
      }${block.collapsed ? " ops-producer-block--collapsed" : ""}`}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
    >
      <header className="ops-producer-block__head">
        <div className="ops-producer-block__head-row">
          <BlockEraHeader
            eraId={block.eraId}
            title={block.title}
            seconds={props.blockSeconds}
          />
          <div className="ops-producer-block__toolbar">
            <label className="ops-producer-block__era-select">
              <span className="ops-dim">Era</span>
              <select
                value={block.eraId}
                disabled={props.busy}
                onChange={(e) =>
                  void patch({
                    op: "producerSetBlockEra",
                    blockId: block.id,
                    eraId: e.target.value,
                  })
                }
              >
                {PRODUCER_ERA_IDS.map((id) => (
                  <option key={id} value={id}>
                    {eraDisplayLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
              disabled={props.busy}
              onClick={() =>
                void patch({
                  op: "producerSetBlockCollapsed",
                  blockId: block.id,
                  collapsed: !block.collapsed,
                })
              }
              aria-expanded={!block.collapsed}
            >
              {block.collapsed ? "Expand" : "Collapse"}
            </button>
          </div>
        </div>
        <div className="ops-producer-block__actions">
          <div className="ops-producer-block__add-wrap">
            <button
              type="button"
              className="ops-btn ops-btn--info ops-producer-block__runtime-btn"
              disabled={props.busy}
              onClick={() => setShowAddMenu((v) => !v)}
            >
              Add Block
            </button>
            {showAddMenu ? (
              <div className="ops-producer-block__add-menu" role="menu">
                {PRODUCER_BLOCK_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="menuitem"
                    className="ops-producer-block__add-menu-item"
                    onClick={() => void addFromTemplate(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
            disabled={props.busy}
            onClick={() => void patch({ op: "producerDuplicateBlock", blockId: block.id })}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
            disabled={props.busy}
            onClick={renameBlock}
          >
            Rename
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
            disabled={props.busy}
            onClick={confirmDelete}
          >
            Delete
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
            disabled={props.busy || props.isFirst}
            onClick={() =>
              void patch({ op: "producerMoveBlock", blockId: block.id, direction: "up" })
            }
          >
            Move Up
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--ghost ops-producer-block__runtime-btn"
            disabled={props.busy || props.isLast}
            onClick={() =>
              void patch({ op: "producerMoveBlock", blockId: block.id, direction: "down" })
            }
          >
            Move Down
          </button>
        </div>
      </header>
      {!block.collapsed ? (
        <>
          <label className="ops-producer-block__notes">
            <span className="ops-dim">Notes</span>
            <textarea
              className="ops-producer-block__notes-input"
              value={notesDraft}
              disabled={props.busy}
              rows={2}
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={() => {
                const trimmed = notesDraft.trim();
                if (trimmed === (block.notes ?? "")) return;
                void patch({
                  op: "producerUpdateBlockNotes",
                  blockId: block.id,
                  notes: trimmed || null,
                });
              }}
            />
          </label>
          {block.assets.length === 0 ? (
            <p className="ops-producer-block__drop">Drop assets here</p>
          ) : (
            <ul className="ops-producer-block__list">
              {block.assets.map((item) => (
                <TimelineAssetRow
                  key={item.id}
                  item={item}
                  busy={props.busy}
                  onRemove={() =>
                    void patch({
                      op: "producerRemoveFromBlock",
                      blockId: block.id,
                      timelineAssetId: item.id,
                    })
                  }
                  onSetOverride={(seconds) =>
                    void patch({
                      op: "producerSetRuntimeOverride",
                      blockId: block.id,
                      timelineAssetId: item.id,
                      runtimeOverrideSeconds: seconds,
                    })
                  }
                  onClearOverride={() =>
                    void patch({
                      op: "producerSetRuntimeOverride",
                      blockId: block.id,
                      timelineAssetId: item.id,
                      runtimeOverrideSeconds: null,
                    })
                  }
                  onToggleApproval={(approvedRuntime) =>
                    void patch({
                      op: "producerSetRuntimeApproval",
                      blockId: block.id,
                      timelineAssetId: item.id,
                      approvedRuntime,
                    })
                  }
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </article>
  );
}

export function YearWorkspaceProducerView(props: Props) {
  const [libraryCategory, setLibraryCategory] =
    useState<ProducerAssetCategoryId>("commercials");
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null);
  const [targetDraft, setTargetDraft] = useState(
    String(props.timeline.targetRuntimeMinutes),
  );
  const [eraTargetDrafts, setEraTargetDrafts] = useState(() => ({
    1967: String(props.timeline.eraTargets[1967]),
    1978: String(props.timeline.eraTargets[1978]),
    1992: String(props.timeline.eraTargets[1992]),
  }));
  const [showAddAtEnd, setShowAddAtEnd] = useState(false);

  useEffect(() => {
    setTargetDraft(String(props.timeline.targetRuntimeMinutes));
  }, [props.timeline.targetRuntimeMinutes]);

  useEffect(() => {
    setEraTargetDrafts({
      1967: String(props.timeline.eraTargets[1967]),
      1978: String(props.timeline.eraTargets[1978]),
      1992: String(props.timeline.eraTargets[1992]),
    });
  }, [props.timeline.eraTargets]);

  const completion = props.workspace?.completion;
  const runtimeSummary = useMemo(
    () => showRuntimeSummary(props.timeline),
    [props.timeline],
  );
  const health = useMemo(() => showRuntimeHealth(props.timeline), [props.timeline]);
  const blockRuntimes = useMemo(
    () => computeBlockRuntimes(props.timeline),
    [props.timeline],
  );
  const showTotalSeconds = useMemo(
    () => computeShowRuntimeSeconds(props.timeline),
    [props.timeline],
  );
  const planningTicks = useMemo(
    () => planningRulerTicks(props.timeline.targetRuntimeMinutes),
    [props.timeline.targetRuntimeMinutes],
  );
  const rulerScaleSeconds = props.timeline.targetRuntimeMinutes * 60;
  const eraBalanceRows = useMemo(
    () => buildEraBalanceRows(props.timeline),
    [props.timeline],
  );
  const eraBreakdown = useMemo(
    () => buildEraBreakdown(props.timeline),
    [props.timeline],
  );
  const { zones: planningZones, placements: zonePlacements } = useMemo(
    () => buildZonePlacements(props.timeline),
    [props.timeline],
  );

  const dashboardCounts = useMemo(() => {
    if (!props.summary) return null;
    const out = {} as Record<ProducerAssetCategoryId, ProducerNeedFoundReady>;
    for (const id of PRODUCER_DASHBOARD_CATEGORIES) {
      out[id] = producerCountsForCategory(id, props.summary!, completion);
    }
    return out;
  }, [props.summary, completion]);

  const libraryCounts = useMemo(() => {
    if (!props.summary) return null;
    return producerCountsForCategory(libraryCategory, props.summary, completion);
  }, [props.summary, completion, libraryCategory]);

  const libraryAssets = useMemo(
    () =>
      buildProducerLibraryAssets(
        libraryCategory,
        props.production,
        props.workspace,
      ),
    [libraryCategory, props.production, props.workspace],
  );

  const assetsByStatus = useMemo(() => {
    const need: ProducerLibraryAsset[] = [];
    const found: ProducerLibraryAsset[] = [];
    const ready: ProducerLibraryAsset[] = [];
    for (const a of libraryAssets) {
      if (a.status === "need") need.push(a);
      else if (a.status === "found") found.push(a);
      else ready.push(a);
    }
    return { need, found, ready };
  }, [libraryAssets]);

  const patch = props.onPatchTimeline;

  const addToBlock = useCallback(
    async (blockId: string, asset: Omit<ProducerLibraryAsset, "id" | "status">) => {
      await patch({
        op: "producerAddToBlock",
        blockId,
        asset,
      });
    },
    [patch],
  );

  async function commitTargetRuntime() {
    const minutes = Number(targetDraft);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    await patch({
      op: "producerSetTargetRuntime",
      targetRuntimeMinutes: Math.round(minutes),
    });
  }

  async function commitEraTarget(era: "1967" | "1978" | "1992") {
    const minutes = Number(eraTargetDrafts[era]);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    await patch({
      op: "producerSetEraTargets",
      eraTargets: { [era]: Math.round(minutes) },
    });
  }

  function onDragStartAsset(e: React.DragEvent, asset: ProducerLibraryAsset) {
    e.dataTransfer.setData(DRAG_MIME, assetDragPayload(asset));
    e.dataTransfer.effectAllowed = "copy";
  }

  function onBlockDragOver(e: React.DragEvent, blockId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverBlockId(blockId);
  }

  async function onBlockDrop(e: React.DragEvent, blockId: string) {
    e.preventDefault();
    setDragOverBlockId(null);
    const raw = e.dataTransfer.getData(DRAG_MIME);
    const asset = parseDragPayload(raw);
    if (!asset) return;
    await addToBlock(blockId, asset);
  }

  function renderAssetList(
    label: string,
    assets: ProducerLibraryAsset[],
    tone: "need" | "found" | "ready",
  ) {
    return (
      <div className={`ops-producer-shelf ops-producer-shelf--${tone}`}>
        <h4 className="ops-producer-shelf__label">{label}</h4>
        {assets.length === 0 ? (
          <p className="ops-dim ops-producer-shelf__empty">—</p>
        ) : (
          <ul className="ops-producer-shelf__list">
            {assets.map((asset) => (
              <li key={asset.id}>
                <button
                  type="button"
                  className="ops-producer-asset"
                  draggable
                  disabled={props.busy}
                  onDragStart={(e) => onDragStartAsset(e, asset)}
                  title={`Drag onto timeline · ${formatProducerDuration(asset.runtimeSeconds)}`}
                >
                  <span className="ops-producer-asset__title">{asset.title}</span>
                  <span className="ops-producer-asset__meta">
                    {asset.subtitle ? (
                      <span className="ops-dim ops-producer-asset__sub">{asset.subtitle}</span>
                    ) : null}
                    <span className="ops-producer-asset__dur">
                      {formatProducerDuration(asset.runtimeSeconds)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const readinessSummary = dashboardCounts ? (
    <span className="ops-producer-readiness-line">
      {PRODUCER_DASHBOARD_CATEGORIES.map((id) => (
        <span key={id}>
          {producerCategoryLabel(id)}{" "}
          <CountsCompact counts={dashboardCounts[id]} />
        </span>
      ))}
    </span>
  ) : null;

  return (
    <div className="ops-producer">
      {dashboardCounts ? (
        <details className="ops-producer-readiness">
          <summary className="ops-producer-readiness__summary">
            Readiness {readinessSummary}
          </summary>
          <div className="ops-producer-dashboard ops-producer-dashboard--compact">
            <div className="ops-producer-dashboard__grid">
              {PRODUCER_DASHBOARD_CATEGORIES.map((id) => (
                <article key={id} className="ops-producer-dashboard__card">
                  <h4 className="ops-producer-dashboard__card-label">
                    {producerCategoryLabel(id)}
                  </h4>
                  <CountsCompact counts={dashboardCounts[id]} />
                </article>
              ))}
            </div>
          </div>
        </details>
      ) : null}

      <div className="ops-producer-board">
        <aside className="ops-producer-library" aria-label="Asset library">
          <h3 className="ops-producer-library__title">Asset Library</h3>
          <nav className="ops-producer-library__nav" aria-label="Asset categories">
            {PRODUCER_ASSET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`ops-producer-library__tab${
                  libraryCategory === cat.id ? " ops-producer-library__tab--on" : ""
                }`}
                onClick={() => setLibraryCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </nav>
          {libraryCounts ? (
            <div className="ops-producer-library__counts">
              <CountsCompact counts={libraryCounts} />
            </div>
          ) : null}
          <div className="ops-producer-library__shelves">
            {renderAssetList("Need", assetsByStatus.need, "need")}
            {renderAssetList("Found", assetsByStatus.found, "found")}
            {renderAssetList("Ready", assetsByStatus.ready, "ready")}
          </div>
        </aside>

        <section className="ops-producer-timeline" aria-label="Show timeline">
          <h3 className="ops-producer-timeline__title">Show Rundown</h3>

          <section className="ops-producer-show-overview" aria-label="Show overview">
            <h4 className="ops-producer-show-overview__title">Show Overview</h4>
            <dl className="ops-producer-show-overview__stats">
              <div>
                <dt>Target Runtime</dt>
                <dd>{props.timeline.targetRuntimeMinutes} min</dd>
              </div>
              <div>
                <dt>Current Runtime</dt>
                <dd>{Math.round(runtimeSummary.currentSeconds / 60)} min</dd>
              </div>
              <div>
                <dt>Remaining</dt>
                <dd>{Math.round(runtimeSummary.remainingSeconds / 60)} min</dd>
              </div>
            </dl>
            <ul className="ops-producer-show-overview__eras">
              {eraBreakdown.map((line) => (
                <li
                  key={line.eraId}
                  className={`ops-producer-show-overview__era ops-producer-era--${line.eraId}`}
                >
                  <span className="ops-producer-show-overview__era-label">{line.label}</span>
                  <span>{line.minutes} min</span>
                </li>
              ))}
            </ul>
          </section>

          <header className="ops-producer-planning">
            <div className="ops-producer-planning__targets">
              <label className="ops-producer-planning__field">
                <span className="ops-producer-planning__field-label">Target Runtime</span>
                <span className="ops-producer-planning__target-input">
                  <input
                    type="number"
                    min={15}
                    max={600}
                    step={15}
                    className="ops-producer-target-input"
                    value={targetDraft}
                    disabled={props.busy}
                    onChange={(e) => setTargetDraft(e.target.value)}
                    onBlur={() => void commitTargetRuntime()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void commitTargetRuntime();
                    }}
                  />
                  <span>min</span>
                </span>
              </label>
              <div className="ops-producer-planning__live">
                <span
                  className={`ops-producer-health ops-producer-health--${health.tone}`}
                >
                  {health.label}
                </span>
              </div>
            </div>
          </header>

          <section className="ops-producer-era-balance" aria-label="Era balance">
            <h4 className="ops-producer-era-balance__title">Era Balance</h4>
            <ul className="ops-producer-era-balance__list">
              {eraBalanceRows.map((row) => (
                <li
                  key={row.eraId}
                  className={`ops-producer-era-balance__row ops-producer-era--${row.eraId}`}
                >
                  <span className="ops-producer-era-balance__era">{row.label}</span>
                  <span className="ops-producer-era-balance__runtime">
                    <span>{row.currentClock}</span>
                    {row.targetClock != null ? (
                      <span className="ops-dim"> / {row.targetClock}</span>
                    ) : null}
                  </span>
                  {row.targetMinutes != null ? (
                    <label className="ops-producer-era-balance__target">
                      <span className="ops-dim">Target</span>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        className="ops-producer-target-input ops-producer-target-input--compact"
                        value={eraTargetDrafts[row.eraId as "1967" | "1978" | "1992"]}
                        disabled={props.busy}
                        onChange={(e) =>
                          setEraTargetDrafts((d) => ({
                            ...d,
                            [row.eraId]: e.target.value,
                          }))
                        }
                        onBlur={() =>
                          void commitEraTarget(row.eraId as "1967" | "1978" | "1992")
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            void commitEraTarget(row.eraId as "1967" | "1978" | "1992");
                          }
                        }}
                      />
                      <span>min</span>
                    </label>
                  ) : null}
                  {row.health ? (
                    <span
                      className={`ops-producer-health ops-producer-health--${row.health.tone}`}
                    >
                      {row.health.label}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <div className="ops-producer-planning-grid" aria-label="15 minute show grid">
            <div className="ops-producer-planning-grid__ruler">
              <div className="ops-producer-planning-grid__ruler-track">
                {planningTicks.map((m) => (
                  <span
                    key={m}
                    className="ops-producer-planning-grid__tick"
                    style={{ left: `${(m * 60) / rulerScaleSeconds * 100}%` }}
                  >
                    {m}
                  </span>
                ))}
                {blockRuntimes.map((block) =>
                  block.totalSeconds > 0 ? (
                    <span
                      key={block.blockId}
                      className={`ops-producer-planning-grid__segment ops-producer-era--${
                        props.timeline.blocks.find((b) => b.id === block.blockId)?.eraId ??
                        "mixed"
                      }`}
                      title={`${block.label}: ${formatProducerDuration(block.totalSeconds)}`}
                      style={{
                        left: `${(block.startSeconds / rulerScaleSeconds) * 100}%`,
                        width: `${(block.totalSeconds / rulerScaleSeconds) * 100}%`,
                      }}
                    />
                  ) : null,
                )}
              </div>
            </div>
            <div className="ops-producer-planning-grid__zones">
              {planningZones.map((zone) => (
                <div key={zone.index} className="ops-producer-planning-grid__zone">
                  <span className="ops-producer-planning-grid__zone-label">
                    [{zone.startMinutes}–{zone.endMinutes}]
                  </span>
                  <div className="ops-producer-planning-grid__zone-blocks">
                    {zonePlacements
                      .filter((p) => p.zoneIndex === zone.index)
                      .map((p) => (
                        <span
                          key={`${p.blockId}-${zone.index}`}
                          className={`ops-producer-planning-grid__block ops-producer-era--${p.eraId}`}
                          style={{ flexGrow: p.weight }}
                          title={p.title}
                        >
                          {p.title}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ops-producer-timeline__stack">
            {props.timeline.blocks.map((block, index) => (
              <ShowBlockCard
                key={block.id}
                block={block}
                blockSeconds={sumBlockRuntimeSeconds(block)}
                dragOver={dragOverBlockId === block.id}
                busy={props.busy}
                isFirst={index === 0}
                isLast={index === props.timeline.blocks.length - 1}
                onPatch={patch}
                onDragOver={(e) => onBlockDragOver(e, block.id)}
                onDragLeave={() => setDragOverBlockId(null)}
                onDrop={(e) => void onBlockDrop(e, block.id)}
              />
            ))}
            <div className="ops-producer-add-end">
              <button
                type="button"
                className="ops-btn ops-btn--info"
                disabled={props.busy}
                onClick={() => setShowAddAtEnd((v) => !v)}
              >
                + Add Block
              </button>
              {showAddAtEnd ? (
                <div className="ops-producer-block__add-menu ops-producer-block__add-menu--end">
                  {PRODUCER_BLOCK_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="ops-producer-block__add-menu-item"
                      onClick={() => {
                        setShowAddAtEnd(false);
                        void patch({ op: "producerAddBlock", templateId: t.id });
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <footer className="ops-producer-show-total">
              <RuntimeDotsRow label="TOTAL SHOW" seconds={showTotalSeconds} />
            </footer>
          </div>

          <section className="ops-producer-export" aria-label="Export show">
            <h4 className="ops-producer-export__title">Export Show</h4>
            <p className="ops-dim ops-producer-export__soon">Coming Soon</p>
            <div className="ops-producer-export__actions">
              <button type="button" className="ops-btn ops-btn--ghost" disabled>
                Export CSV
              </button>
              <button type="button" className="ops-btn ops-btn--ghost" disabled>
                Export M3U
              </button>
            </div>
            <p className="ops-dim ops-producer-export__hint">
              Retroverse → VirtualDJ playlist workflow
            </p>
          </section>
        </section>
      </div>
    </div>
  );
}
