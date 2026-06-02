"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PRODUCER_ASSET_CATEGORIES,
  PRODUCER_DASHBOARD_CATEGORIES,
  PRODUCER_TIMELINE_BLOCKS,
  producerCategoryLabel,
} from "@/lib/ops/year-workspace/producer/config";
import { producerCountsForCategory } from "@/lib/ops/year-workspace/producer/counts";
import { buildProducerLibraryAssets } from "@/lib/ops/year-workspace/producer/assets";
import {
  computeBlockRuntimes,
  computeShowRuntimeSeconds,
  effectiveRuntimeSeconds,
  formatProducerDuration,
  formatProducerMmSs,
  parseProducerMmSs,
  rulerMarkersMinutes,
  showRuntimeSummary,
} from "@/lib/ops/year-workspace/producer/runtime";
import type {
  ProducerAssetCategoryId,
  ProducerLibraryAsset,
  ProducerNeedFoundReady,
  ProducerTimelineAsset,
  ProducerTimelineBlockId,
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
    <p className="ops-producer-counts-compact">
      <span>N {counts.need}</span>
      <span>F {counts.found}</span>
      <span>R {counts.ready}</span>
      {counts.missing > 0 ? (
        <span className="ops-producer-counts-compact__miss">−{counts.missing}</span>
      ) : null}
    </p>
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

function TimelineAssetRow(props: {
  blockId: ProducerTimelineBlockId;
  item: ProducerTimelineAsset;
  busy: boolean;
  onRemove: () => void;
  onSetOverride: (seconds: number) => void;
  onClearOverride: () => void;
}) {
  const { item } = props;
  const effective = effectiveRuntimeSeconds(item);
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
          <span className="ops-producer-block__item-runtime-used" title="Runtime used">
            {formatProducerDuration(effective)}
          </span>
          <span className="ops-dim ops-producer-block__item-runtime-src" title="Source runtime">
            src {formatProducerDuration(item.runtimeSeconds)}
          </span>
          {hasOverride ? (
            <span className="ops-producer-block__item-runtime-ovr">override</span>
          ) : null}
        </div>
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

export function YearWorkspaceProducerView(props: Props) {
  const [libraryCategory, setLibraryCategory] =
    useState<ProducerAssetCategoryId>("commercials");
  const [dragOverBlock, setDragOverBlock] = useState<ProducerTimelineBlockId | null>(
    null,
  );
  const [targetDraft, setTargetDraft] = useState(
    String(props.timeline.targetRuntimeMinutes),
  );

  useEffect(() => {
    setTargetDraft(String(props.timeline.targetRuntimeMinutes));
  }, [props.timeline.targetRuntimeMinutes]);

  const completion = props.workspace?.completion;

  const runtimeSummary = useMemo(
    () => showRuntimeSummary(props.timeline),
    [props.timeline],
  );

  const blockRuntimes = useMemo(
    () => computeBlockRuntimes(props.timeline),
    [props.timeline],
  );

  const showTotalSeconds = useMemo(
    () => computeShowRuntimeSeconds(props.timeline),
    [props.timeline],
  );

  const rulerMarkers = useMemo(
    () => rulerMarkersMinutes(props.timeline.targetRuntimeMinutes),
    [props.timeline.targetRuntimeMinutes],
  );

  const rulerScaleSeconds = props.timeline.targetRuntimeMinutes * 60;

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
    return producerCountsForCategory(
      libraryCategory,
      props.summary,
      completion,
    );
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

  const addToBlock = useCallback(
    async (
      blockId: ProducerTimelineBlockId,
      asset: Omit<ProducerLibraryAsset, "id" | "status">,
    ) => {
      await props.onPatchTimeline({
        op: "producerAddToBlock",
        blockId,
        asset,
      });
    },
    [props],
  );

  const removeFromBlock = useCallback(
    async (blockId: ProducerTimelineBlockId, timelineAssetId: string) => {
      await props.onPatchTimeline({
        op: "producerRemoveFromBlock",
        blockId,
        timelineAssetId,
      });
    },
    [props],
  );

  const setOverride = useCallback(
    async (
      blockId: ProducerTimelineBlockId,
      timelineAssetId: string,
      runtimeOverrideSeconds: number,
    ) => {
      await props.onPatchTimeline({
        op: "producerSetRuntimeOverride",
        blockId,
        timelineAssetId,
        runtimeOverrideSeconds,
      });
    },
    [props],
  );

  const clearOverride = useCallback(
    async (blockId: ProducerTimelineBlockId, timelineAssetId: string) => {
      await props.onPatchTimeline({
        op: "producerSetRuntimeOverride",
        blockId,
        timelineAssetId,
        runtimeOverrideSeconds: null,
      });
    },
    [props],
  );

  async function commitTargetRuntime() {
    const minutes = Number(targetDraft);
    if (!Number.isFinite(minutes) || minutes <= 0) return;
    await props.onPatchTimeline({
      op: "producerSetTargetRuntime",
      targetRuntimeMinutes: Math.round(minutes),
    });
  }

  function onDragStartAsset(e: React.DragEvent, asset: ProducerLibraryAsset) {
    e.dataTransfer.setData(DRAG_MIME, assetDragPayload(asset));
    e.dataTransfer.effectAllowed = "copy";
  }

  function onBlockDragOver(e: React.DragEvent, blockId: ProducerTimelineBlockId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOverBlock(blockId);
  }

  async function onBlockDrop(e: React.DragEvent, blockId: ProducerTimelineBlockId) {
    e.preventDefault();
    setDragOverBlock(null);
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

  return (
    <div className="ops-producer">
      {dashboardCounts ? (
        <section
          className="ops-producer-dashboard ops-producer-dashboard--compact"
          aria-labelledby="ops-producer-dash"
        >
          <h3 id="ops-producer-dash" className="ops-producer-dashboard__title">
            Readiness
          </h3>
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
        </section>
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
          <header className="ops-producer-planning">
            <h3 className="ops-producer-timeline__title">Show Timeline</h3>
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
                    aria-label="Target runtime minutes"
                  />
                  <span>min</span>
                </span>
              </label>
              <div className="ops-producer-planning__live">
                <span>
                  <em>Current</em>{" "}
                  <strong>
                    {Math.round(runtimeSummary.currentSeconds / 60)} min
                  </strong>
                  <span className="ops-dim">
                    {" "}
                    ({formatProducerDuration(runtimeSummary.currentSeconds)})
                  </span>
                </span>
                <span>
                  <em>Remaining</em>{" "}
                  <strong>
                    {Math.round(runtimeSummary.remainingSeconds / 60)} min
                  </strong>
                  <span className="ops-dim">
                    {" "}
                    ({formatProducerDuration(runtimeSummary.remainingSeconds)})
                  </span>
                </span>
              </div>
            </div>
          </header>

          <div
            className="ops-producer-ruler"
            aria-label="Timeline ruler (15 minute markers)"
            style={
              {
                "--ruler-scale-seconds": String(rulerScaleSeconds),
              } as React.CSSProperties
            }
          >
            <div className="ops-producer-ruler__track">
              {rulerMarkers.map((m) => (
                <span
                  key={m}
                  className="ops-producer-ruler__tick"
                  style={{ left: `${(m * 60) / rulerScaleSeconds * 100}%` }}
                >
                  <span className="ops-producer-ruler__tick-label">{m}</span>
                </span>
              ))}
              {blockRuntimes.map((block) =>
                block.totalSeconds > 0 ? (
                  <span
                    key={block.blockId}
                    className="ops-producer-ruler__span"
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

          <div className="ops-producer-timeline__stack">
            {PRODUCER_TIMELINE_BLOCKS.map((block) => {
              const items = props.timeline.blocks[block.id] ?? [];
              const blockRuntime = blockRuntimes.find((b) => b.blockId === block.id);
              const over = dragOverBlock === block.id;
              return (
                <article
                  key={block.id}
                  className={`ops-producer-block${over ? " ops-producer-block--over" : ""}`}
                  onDragOver={(e) => onBlockDragOver(e, block.id)}
                  onDragLeave={() => setDragOverBlock(null)}
                  onDrop={(e) => void onBlockDrop(e, block.id)}
                >
                  <header className="ops-producer-block__head">
                    <RuntimeDotsRow
                      label={block.label.toUpperCase()}
                      seconds={blockRuntime?.totalSeconds ?? 0}
                    />
                    <p className="ops-dim ops-producer-block__hint">{block.hint}</p>
                  </header>
                  {items.length === 0 ? (
                    <p className="ops-producer-block__drop">Drop assets here</p>
                  ) : (
                    <ul className="ops-producer-block__list">
                      {items.map((item) => (
                        <TimelineAssetRow
                          key={item.id}
                          blockId={block.id}
                          item={item}
                          busy={props.busy}
                          onRemove={() => void removeFromBlock(block.id, item.id)}
                          onSetOverride={(seconds) =>
                            void setOverride(block.id, item.id, seconds)
                          }
                          onClearOverride={() => void clearOverride(block.id, item.id)}
                        />
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
            <footer className="ops-producer-show-total">
              <RuntimeDotsRow label="TOTAL SHOW" seconds={showTotalSeconds} />
            </footer>
          </div>
        </section>
      </div>
    </div>
  );
}
