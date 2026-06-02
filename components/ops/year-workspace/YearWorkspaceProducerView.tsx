"use client";

import { useCallback, useMemo, useState } from "react";

import {
  PRODUCER_ASSET_CATEGORIES,
  PRODUCER_DASHBOARD_CATEGORIES,
  PRODUCER_TIMELINE_BLOCKS,
  producerCategoryLabel,
} from "@/lib/ops/year-workspace/producer/config";
import { producerCountsForCategory } from "@/lib/ops/year-workspace/producer/counts";
import { buildProducerLibraryAssets } from "@/lib/ops/year-workspace/producer/assets";
import type {
  ProducerAssetCategoryId,
  ProducerLibraryAsset,
  ProducerNeedFoundReady,
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

function CountsRow(props: { counts: ProducerNeedFoundReady }) {
  const { counts } = props;
  return (
    <div className="ops-producer-counts">
      <span>
        Need: <strong>{counts.need}</strong>
      </span>
      <span>
        Found: <strong>{counts.found}</strong>
      </span>
      <span>
        Ready: <strong>{counts.ready}</strong>
      </span>
      {counts.missing > 0 ? (
        <span className="ops-producer-counts__missing">
          Missing: <strong>{counts.missing}</strong>
        </span>
      ) : null}
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
  });
}

function parseDragPayload(raw: string): Omit<ProducerLibraryAsset, "id" | "status"> | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.producerCategory !== "string") return null;
    if (typeof o.productionCategory !== "string") return null;
    if (typeof o.productionItemId !== "string") return null;
    if (typeof o.title !== "string") return null;
    return {
      producerCategory: o.producerCategory as ProducerAssetCategoryId,
      productionCategory: o.productionCategory as ProducerLibraryAsset["productionCategory"],
      productionItemId: o.productionItemId,
      title: o.title,
      subtitle: typeof o.subtitle === "string" ? o.subtitle : null,
    };
  } catch {
    return null;
  }
}

export function YearWorkspaceProducerView(props: Props) {
  const [libraryCategory, setLibraryCategory] =
    useState<ProducerAssetCategoryId>("commercials");
  const [dragOverBlock, setDragOverBlock] = useState<ProducerTimelineBlockId | null>(
    null,
  );

  const completion = props.workspace?.completion;

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
    async (blockId: ProducerTimelineBlockId, asset: Omit<ProducerLibraryAsset, "id" | "status">) => {
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
                  title="Drag onto a timeline block"
                >
                  <span className="ops-producer-asset__title">{asset.title}</span>
                  {asset.subtitle ? (
                    <span className="ops-dim ops-producer-asset__sub">{asset.subtitle}</span>
                  ) : null}
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
      <header className="ops-producer__intro">
        <p className="ops-producer__kicker">1967 · Producer View</p>
        <h2 className="ops-producer__title">Rundown board</h2>
        <p className="ops-dim ops-producer__hint">
          Television-station layout — asset library on the left, show timeline on the right.
          Drag assets into blocks. Classic Year Workspace is unchanged; switch views above.
        </p>
      </header>

      {dashboardCounts ? (
        <section className="ops-producer-dashboard" aria-labelledby="ops-producer-dash">
          <h3 id="ops-producer-dash" className="ops-producer-dashboard__title">
            Show Readiness
          </h3>
          <div className="ops-producer-dashboard__grid">
            {PRODUCER_DASHBOARD_CATEGORIES.map((id) => {
              const counts = dashboardCounts[id];
              return (
                <article key={id} className="ops-producer-dashboard__card">
                  <h4 className="ops-producer-dashboard__card-label">
                    {producerCategoryLabel(id)}
                  </h4>
                  <CountsRow counts={counts} />
                </article>
              );
            })}
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
              <CountsRow counts={libraryCounts} />
            </div>
          ) : null}
          <div className="ops-producer-library__shelves">
            {renderAssetList("Need", assetsByStatus.need, "need")}
            {renderAssetList("Found", assetsByStatus.found, "found")}
            {renderAssetList("Ready", assetsByStatus.ready, "ready")}
          </div>
        </aside>

        <section className="ops-producer-timeline" aria-label="Show timeline">
          <h3 className="ops-producer-timeline__title">Show Timeline</h3>
          <div className="ops-producer-timeline__stack">
            {PRODUCER_TIMELINE_BLOCKS.map((block) => {
              const items = props.timeline.blocks[block.id] ?? [];
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
                    <h4 className="ops-producer-block__title">{block.label}</h4>
                    <p className="ops-dim ops-producer-block__hint">{block.hint}</p>
                  </header>
                  {items.length === 0 ? (
                    <p className="ops-producer-block__drop">Drop assets here</p>
                  ) : (
                    <ul className="ops-producer-block__list">
                      {items.map((item) => (
                        <li key={item.id} className="ops-producer-block__item">
                          <span className="ops-producer-block__item-cat">
                            {producerCategoryLabel(item.producerCategory)}
                          </span>
                          <span className="ops-producer-block__item-title">{item.title}</span>
                          {item.subtitle ? (
                            <span className="ops-dim ops-producer-block__item-sub">
                              {item.subtitle}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            className="ops-btn ops-btn--ghost ops-producer-block__remove"
                            disabled={props.busy}
                            onClick={() => void removeFromBlock(block.id, item.id)}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
