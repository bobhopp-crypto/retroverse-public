"use client";

import { useCallback, useEffect, useState } from "react";

import {
  OpsYearWorkspaceSongDetailModal,
  OpsYearWorkspaceSongs,
} from "@/components/ops/year-workspace/OpsYearWorkspaceSongs";
import { YearWorkspaceDropZone } from "@/components/ops/year-workspace/YearWorkspaceDropZone";
import { YearWorkspaceProductionTab } from "@/components/ops/year-workspace/YearWorkspaceProductionTab";
import { YearWorkspaceSourceDrawer } from "@/components/ops/year-workspace/YearWorkspaceSourceDrawer";
import { YearWorkspaceProducerView } from "@/components/ops/year-workspace/YearWorkspaceProducerView";
import { YearWorkspaceSummary } from "@/components/ops/year-workspace/YearWorkspaceSummary";
import { emptyProducerTimeline } from "@/lib/ops/year-workspace/producer/empty-timeline";
import type { ProducerTimelineState } from "@/lib/ops/year-workspace/producer/types";
import type {
  ProductionItem,
  ProductionWorkflowAction,
  ShowReadinessSummary,
  YearWorkspaceProductionBundle,
  YearWorkspaceProductionState,
} from "@/lib/ops/year-workspace/production-types";
import type { SourceDiscoveryDrawerPayload } from "@/lib/ops/year-workspace/source-discovery/types";
import type {
  YearWorkspaceCategoryId,
  YearWorkspaceData,
  YearWorkspaceRow,
  YearWorkspaceWorkflowAction,
} from "@/lib/ops/year-workspace/types";
import { YEAR_WORKSPACE_CATEGORIES } from "@/lib/ops/year-workspace/types";
import type { YearWorkspaceKeyword } from "@/lib/ops/year-workspace/vocabulary";

type PoolMeta = { total: number; remaining: number };

type WorkspaceViewMode = "workspace" | "producer";

type ApiPayload = {
  ok?: boolean;
  workspace?: YearWorkspaceData;
  production?: YearWorkspaceProductionState;
  summary?: YearWorkspaceProductionBundle["summary"];
  recommendationPools?: Record<string, PoolMeta>;
  recommendationResult?: PoolMeta & { added: number; poolTotal: number };
  showReadiness?: ShowReadinessSummary;
  producerTimeline?: ProducerTimelineState;
  sourceDrawer?: SourceDiscoveryDrawerPayload;
  vocabulary?: YearWorkspaceKeyword[];
  error?: string;
};

export function OpsYearWorkspace(props: { year: number }) {
  const [workspace, setWorkspace] = useState<YearWorkspaceData | null>(null);
  const [production, setProduction] = useState<YearWorkspaceProductionState | null>(null);
  const [summary, setSummary] = useState<YearWorkspaceProductionBundle["summary"] | null>(
    null,
  );
  const [showReadiness, setShowReadiness] = useState<ShowReadinessSummary | null>(
    null,
  );
  const [vocabulary, setVocabulary] = useState<YearWorkspaceKeyword[]>([]);
  const [category, setCategory] = useState<YearWorkspaceCategoryId>("songs");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<YearWorkspaceRow | null>(null);
  const [draftKeywords, setDraftKeywords] = useState<YearWorkspaceKeyword[]>([]);
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [recommendationPools, setRecommendationPools] = useState<
    Record<string, PoolMeta> | null
  >(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceDrawer, setSourceDrawer] = useState<SourceDiscoveryDrawerPayload | null>(
    null,
  );
  const [drawerRecommendationId, setDrawerRecommendationId] = useState<string | null>(
    null,
  );
  const [busySourceId, setBusySourceId] = useState<string | null>(null);
  const [attachQueueItemId, setAttachQueueItemId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>("workspace");
  const [producerTimeline, setProducerTimeline] = useState<ProducerTimelineState>(
    () => emptyProducerTimeline(props.year),
  );
  const [producerBusy, setProducerBusy] = useState(false);

  const applyPayload = useCallback((data: ApiPayload) => {
    if (data.workspace) setWorkspace(data.workspace);
    if (data.production) setProduction(data.production);
    if (data.summary) setSummary(data.summary);
    if (data.vocabulary) setVocabulary(data.vocabulary);
    if (data.recommendationPools) setRecommendationPools(data.recommendationPools);
    if (data.showReadiness) setShowReadiness(data.showReadiness);
    if (data.producerTimeline) setProducerTimeline(data.producerTimeline);
    if (data.sourceDrawer) setSourceDrawer(data.sourceDrawer);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/year-workspace?year=${props.year}`);
      const data = (await res.json()) as ApiPayload;
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.error ?? `Load failed (${res.status})`);
        return;
      }
      applyPayload(data);
    } catch {
      setError("Failed to load year workspace");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, props.year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchApi(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/year-workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: props.year, ...body }),
    });
    const data = (await res.json()) as ApiPayload;
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    applyPayload(data);
    return data;
  }

  function openDetail(row: YearWorkspaceRow) {
    setDetailRow(row);
    setDraftKeywords([...row.keywords]);
    setNotice(null);
  }

  function toggleKeyword(keyword: YearWorkspaceKeyword) {
    setDraftKeywords((list) =>
      list.includes(keyword) ? list.filter((k) => k !== keyword) : [...list, keyword],
    );
  }

  async function saveKeywords() {
    if (!detailRow) return;
    setSaving(true);
    setNotice(null);
    try {
      await patchApi({
        workspaceKey: detailRow.workspaceKey,
        keywords: draftKeywords,
      });
      setNotice("Keywords saved");
      setDetailRow(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function saveChartAction(
    row: YearWorkspaceRow,
    action: YearWorkspaceWorkflowAction,
  ) {
    setBusyKey(row.workspaceKey);
    setNotice(null);
    try {
      await patchApi({
        workspaceKey: row.workspaceKey,
        chartAction: action,
      });
      setNotice(`${row.title}: ${action}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function runProductionOp(body: Record<string, unknown>) {
    await patchApi(body);
  }

  async function generateRecommendations(
    cat: YearWorkspaceCategoryId,
    more = false,
  ) {
    setGenerating(true);
    setNotice(null);
    try {
      const data = await patchApi({
        op: more ? "generateMoreRecommendations" : "generateRecommendations",
        category: cat,
      });
      const added = data.recommendationResult?.added ?? 0;
      const remaining = data.recommendationResult?.remaining;
      setNotice(
        added > 0
          ? `Added ${added} to Wanted${remaining != null ? ` · ${remaining} curated left` : ""}`
          : "No new recommendations left in curated pool",
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function productionItemAction(
    cat: YearWorkspaceCategoryId,
    itemId: string,
    action: ProductionWorkflowAction,
  ) {
    setBusyItemId(itemId);
    setNotice(null);
    try {
      await runProductionOp({ op: "itemAction", category: cat, itemId, productionAction: action });
      setNotice(`Saved: ${action}`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyItemId(null);
    }
  }

  async function dropAssets(
    cat: YearWorkspaceCategoryId,
    filenames: string[],
    queueItemId?: string | null,
  ) {
    setNotice(null);
    try {
      await runProductionOp({
        op: "addAssets",
        category: cat,
        filenames,
        ...(queueItemId ? { queueItemId } : {}),
      });
      setNotice(
        queueItemId
          ? `Attached ${filenames.length} file(s) to queue item`
          : `Recorded ${filenames.length} file(s)`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Drop failed");
    }
  }

  async function openFindSources(item: ProductionItem) {
    setBusyItemId(item.id);
    setDrawerRecommendationId(item.id);
    setNotice(null);
    try {
      const data = await patchApi({
        op: "findSources",
        category,
        recommendationId: item.id,
      });
      if (data.sourceDrawer) setSourceDrawer(data.sourceDrawer);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Find sources failed");
      setDrawerRecommendationId(null);
    } finally {
      setBusyItemId(null);
    }
  }

  async function selectSource(sourceId: string) {
    if (!drawerRecommendationId) return;
    setBusySourceId(sourceId);
    setNotice(null);
    try {
      await patchApi({
        op: "selectSource",
        category,
        recommendationId: drawerRecommendationId,
        sourceId,
      });
      setNotice("Added to Acquisition Queue");
      setSourceDrawer(null);
      setDrawerRecommendationId(null);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Select failed");
    } finally {
      setBusySourceId(null);
    }
  }

  async function rejectSource(sourceId: string) {
    if (!drawerRecommendationId) return;
    setBusySourceId(sourceId);
    try {
      const data = await patchApi({
        op: "rejectSource",
        category,
        recommendationId: drawerRecommendationId,
        sourceId,
      });
      if (data.sourceDrawer) setSourceDrawer(data.sourceDrawer);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusySourceId(null);
    }
  }

  async function patchProducerTimeline(body: Record<string, unknown>) {
    setProducerBusy(true);
    setNotice(null);
    try {
      await patchApi(body);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Timeline update failed");
    } finally {
      setProducerBusy(false);
    }
  }

  const categoryMeta = YEAR_WORKSPACE_CATEGORIES.find((c) => c.id === category);
  const categoryLabel = categoryMeta?.label ?? category;
  const productionFile = production?.[category];
  const poolMeta = recommendationPools?.[category] ?? null;

  return (
    <div className={`ops-yw${viewMode === "producer" ? " ops-yw--producer" : ""}`}>
      <header className="ops-yw__head">
        <div>
          <p className="ops-yw__kicker">1967 production workspace</p>
          <h2 className="ops-yw__title">
            Build the full year experience — songs, media, and show layers
          </h2>
        </div>
        <div className="ops-yw__head-actions">
          <nav className="ops-yw-view-toggle" aria-label="Workspace view">
            <button
              type="button"
              className={`ops-yw-view-toggle__btn${
                viewMode === "workspace" ? " ops-yw-view-toggle__btn--on" : ""
              }`}
              onClick={() => setViewMode("workspace")}
            >
              Workspace
            </button>
            <button
              type="button"
              className={`ops-yw-view-toggle__btn${
                viewMode === "producer" ? " ops-yw-view-toggle__btn--on" : ""
              }`}
              onClick={() => setViewMode("producer")}
            >
              Producer View
            </button>
          </nav>
          <button type="button" className="ops-btn ops-btn--info" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </header>

      {viewMode === "producer" && !loading && !error ? (
        <YearWorkspaceProducerView
          year={props.year}
          workspace={workspace}
          production={production}
          summary={summary}
          timeline={producerTimeline}
          busy={producerBusy}
          onPatchTimeline={patchProducerTimeline}
        />
      ) : null}

      {viewMode === "workspace" && summary && showReadiness ? (
        <YearWorkspaceSummary
          year={props.year}
          summary={summary}
          showReadiness={showReadiness}
          activeCategory={category}
          onSelectCategory={(id) => setCategory(id as YearWorkspaceCategoryId)}
        />
      ) : null}

      {viewMode === "workspace" ? (
      <nav className="ops-yw-categories" aria-label="Year workspace categories">
        {YEAR_WORKSPACE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`ops-yw-category${category === cat.id ? " ops-yw-category--on" : ""}`}
            onClick={() => setCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </nav>
      ) : null}

      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="ops-empty">Loading {props.year} workspace…</p>
      ) : error ? (
        <p className="ops-empty">{error}</p>
      ) : viewMode === "workspace" && category === "songs" && workspace ? (
        <>
          <OpsYearWorkspaceSongs
            year={props.year}
            workspace={workspace}
            vocabulary={vocabulary}
            busyKey={busyKey}
            onRowClick={openDetail}
            onChartAction={(row, action) => void saveChartAction(row, action)}
          />
          <YearWorkspaceDropZone
            categoryLabel="Songs"
            onDropFilenames={(names) => void dropAssets("songs", names, null)}
          />
        </>
      ) : viewMode === "workspace" && productionFile ? (
        <YearWorkspaceProductionTab
          year={props.year}
          category={category}
          categoryLabel={categoryLabel}
          file={productionFile}
          busyItemId={busyItemId}
          generating={generating}
          poolRemaining={poolMeta?.remaining ?? null}
          poolTotal={poolMeta?.total ?? null}
          attachQueueItemId={attachQueueItemId}
          onAttachQueueItemChange={setAttachQueueItemId}
          onGenerate={() => void generateRecommendations(category, false)}
          onGenerateMore={() => void generateRecommendations(category, true)}
          onItemAction={(itemId, action) =>
            void productionItemAction(category, itemId, action)
          }
          onFindSources={(item) => void openFindSources(item)}
          onDropFilenames={(names, queueId) =>
            void dropAssets(category, names, queueId)
          }
        />
      ) : null}

      <YearWorkspaceSourceDrawer
        open={sourceDrawer != null}
        drawer={sourceDrawer}
        busySourceId={busySourceId}
        onClose={() => {
          setSourceDrawer(null);
          setDrawerRecommendationId(null);
        }}
        onSelect={(id) => void selectSource(id)}
        onReject={(id) => void rejectSource(id)}
      />

      {detailRow ? (
        <OpsYearWorkspaceSongDetailModal
          detailRow={detailRow}
          vocabulary={vocabulary}
          draftKeywords={draftKeywords}
          saving={saving}
          onClose={() => setDetailRow(null)}
          onToggleKeyword={toggleKeyword}
          onSave={() => void saveKeywords()}
        />
      ) : null}
    </div>
  );
}
