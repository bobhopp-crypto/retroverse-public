import { NextResponse } from "next/server";

import { loadReviewUniverse } from "@/lib/ops/load-review-universe";
import { loadYearWorkspace } from "@/lib/ops/load-year-workspace";
import {
  normalizeRvtr,
  saveRetroverseTagsForRvtr,
} from "@/lib/ops/retroverse-tags/store";
import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
import { computeReviewApiMetrics } from "@/lib/ops/year-workspace/enrich-vdj-meta";
import { loadActiveYearConnections } from "@/lib/ops/year-workspace/active-year-connections";
import {
  REVIEW_PILOT_ACTIVE_YEARS,
  reviewUniverseEnabledForYear,
} from "@/lib/ops/year-workspace/review-pilot";
import { loadYearWorkspaceProductionBundleForYear } from "@/lib/ops/year-workspace/load-production-bundle";
import {
  enqueueFromSelectedSource,
  rejectSourceCandidate,
} from "@/lib/ops/year-workspace/acquisition-queue";
import {
  addProductionAssets,
  appendCategoryRecommendations,
  applyProductionItemAction,
  loadCategoryProduction,
} from "@/lib/ops/year-workspace/production-state";
import { findSourcesForRecommendation } from "@/lib/ops/year-workspace/source-discovery/source-state";
import { curatedPoolStats } from "@/lib/ops/year-workspace/recommendations/generator";
import { hasCuratedProvider } from "@/lib/ops/year-workspace/recommendations/providers";
import type { ProductionWorkflowAction } from "@/lib/ops/year-workspace/production-types";
import {
  loadYearWorkspaceState,
  saveYearWorkspaceChartAction,
  saveYearWorkspaceKeywords,
} from "@/lib/ops/year-workspace/state";
import {
  saveBulkClassification,
  saveYearReviewRecord,
  type ReviewRecordPatch,
} from "@/lib/ops/year-workspace/review-state";
import {
  isReviewClassification,
  normalizeHistoricalTags,
} from "@/lib/ops/year-workspace/review-types";
import { filterReviewUniverseTags } from "@/lib/ops/rvtags-review/vocabulary";
import type {
  YearWorkspaceCategoryId,
  YearWorkspaceWorkflowAction,
} from "@/lib/ops/year-workspace/types";

type YearWorkspaceProductionCategoryId = Exclude<
  YearWorkspaceCategoryId,
  "songs"
>;
import { YEAR_WORKSPACE_CATEGORIES } from "@/lib/ops/year-workspace/types";
import {
  normalizeYearWorkspaceKeywords,
  YEAR_WORKSPACE_KEYWORDS,
} from "@/lib/ops/year-workspace/vocabulary";
import {
  addAssetToProducerBlock,
  addProducerBlock,
  deleteProducerBlock,
  duplicateProducerBlock,
  loadProducerTimeline,
  moveProducerBlock,
  removeAssetFromProducerBlock,
  renameProducerBlock,
  setProducerBlockCollapsed,
  setProducerBlockEra,
  setProducerEraTargets,
  setProducerRuntimeApproval,
  setProducerRuntimeOverride,
  setProducerTargetRuntimeMinutes,
  updateProducerBlockNotes,
} from "@/lib/ops/year-workspace/producer/timeline-state";
import { parseProducerEraId } from "@/lib/ops/year-workspace/producer/era";
import type { ProducerBlockTemplateId } from "@/lib/ops/year-workspace/producer/types";
import { inspectPing } from "@/lib/inspect/pg";

export const dynamic = "force-dynamic";

const CATEGORY_IDS = new Set(
  YEAR_WORKSPACE_CATEGORIES.map((c) => c.id),
);

function parseYear(value: string | null): number {
  const y = Number(value);
  if (Number.isFinite(y) && y >= 1900 && y < 2100) return y;
  return OPS_FOCUS_YEAR;
}

function parseCategory(value: unknown): YearWorkspaceCategoryId | null {
  if (typeof value !== "string") return null;
  return CATEGORY_IDS.has(value as YearWorkspaceCategoryId)
    ? (value as YearWorkspaceCategoryId)
    : null;
}

function recommendationPoolMeta(
  year: number,
  production: Awaited<
    ReturnType<typeof loadYearWorkspaceProductionBundleForYear>
  >["production"],
) {
  if (!hasCuratedProvider(year)) return null;
  const categories = YEAR_WORKSPACE_CATEGORIES.filter(
    (c): c is (typeof YEAR_WORKSPACE_CATEGORIES)[number] & {
      id: YearWorkspaceProductionCategoryId;
    } => c.id !== "songs",
  );
  const pools: Record<string, { total: number; remaining: number }> = {};
  for (const { id } of categories) {
    const ids = new Set(production[id].items.map((i) => i.id));
    const stats = curatedPoolStats(year, id, ids);
    pools[id] = stats;
  }
  return pools;
}

const PRODUCER_OPS = new Set([
  "producerAddToBlock",
  "producerRemoveFromBlock",
  "producerSetTargetRuntime",
  "producerSetRuntimeOverride",
  "producerSetRuntimeApproval",
  "producerAddBlock",
  "producerDuplicateBlock",
  "producerRenameBlock",
  "producerUpdateBlockNotes",
  "producerDeleteBlock",
  "producerMoveBlock",
  "producerSetBlockCollapsed",
  "producerSetBlockEra",
  "producerSetEraTargets",
]);

function parseBlockId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return id.length > 0 ? id : null;
}

function parseTemplateId(value: unknown): ProducerBlockTemplateId | null {
  const ids: ProducerBlockTemplateId[] = [
    "segment_1967",
    "segment_1978",
    "segment_1992",
    "music_segment",
    "commercial_break",
    "tv_memory",
    "news_segment",
    "feature_segment",
    "custom",
  ];
  if (typeof value !== "string") return null;
  return ids.includes(value as ProducerBlockTemplateId)
    ? (value as ProducerBlockTemplateId)
    : null;
}

async function producerOpError(
  year: number,
  fn: () => Promise<unknown>,
): Promise<Response> {
  try {
    await fn();
    return NextResponse.json(await fullPayload(year));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Producer update failed" },
      { status: 400 },
    );
  }
}

async function fullPayload(year: number) {
  const workspace = await loadYearWorkspace(year);
  const bundle = await loadYearWorkspaceProductionBundleForYear(
    year,
    workspace.completion,
  );
  const keywordState = await loadYearWorkspaceState(year);
  const producerTimeline = await loadProducerTimeline(year);
  const { matchedRows, missingRows, playCountRows, needsReviewRows } =
    computeReviewApiMetrics(workspace.reviewRows, keywordState);
  return {
    ok: true as const,
    year,
    reviewMode: "chart_workspace" as const,
    pilotMode: false,
    pilotTopN: null,
    pilotActiveYears: null,
    workspace,
    production: bundle.production,
    summary: bundle.summary,
    producerTimeline,
    recommendationPools: recommendationPoolMeta(year, bundle.production),
    vocabulary: YEAR_WORKSPACE_KEYWORDS,
    keywordState: {
      updatedAt: keywordState.updatedAt,
      assignedCount: Object.keys(keywordState.keywords).length,
      chartActionCount: Object.keys(keywordState.chartActions).length,
      reviewCount: Object.keys(keywordState.reviews).length,
    },
    matchedRows,
    missingRows,
    playCountRows,
    needsReviewRows,
  };
}

async function reviewUniversePayload(year: number) {
  const payload = await loadReviewUniverse(year);
  return {
    ...payload,
    pilotMode: true,
    pilotTopN: null,
    pilotActiveYears: [...REVIEW_PILOT_ACTIVE_YEARS],
  };
}

async function workspaceGetPayload(year: number) {
  if (reviewUniverseEnabledForYear(year)) {
    return reviewUniversePayload(year);
  }
  return fullPayload(year);
}

export async function GET(req: Request) {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline" },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const year = parseYear(url.searchParams.get("year"));

  if (url.searchParams.get("activeYears") === "1") {
    const workspaceKey = url.searchParams.get("workspaceKey")?.trim() ?? "";
    if (!workspaceKey) {
      return NextResponse.json({ error: "workspaceKey required" }, { status: 400 });
    }
    try {
      const review = await loadReviewUniverse(year);
      const row = review.workspace.reviewRows.find(
        (r) => r.workspaceKey === workspaceKey,
      );
      if (!row) {
        return NextResponse.json({ error: "Row not in video universe" }, { status: 404 });
      }
      const connections = await loadActiveYearConnections({
        focusYear: year,
        artist: row.artist,
        title: row.title,
        activeYears: review.activeYears,
      });
      return NextResponse.json({ ok: true, connections });
    } catch (err) {
      console.error("[year-workspace activeYears]", err);
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : "Active year connections failed",
        },
        { status: 500 },
      );
    }
  }

  try {
    return NextResponse.json(await workspaceGetPayload(year));
  } catch (err) {
    console.error("[year-workspace GET]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Year workspace load failed",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    year?: number;
    op?: string;
    category?: string;
    itemId?: string;
    recommendationId?: string;
    sourceId?: string;
    queueItemId?: string;
    productionAction?: ProductionWorkflowAction;
    filenames?: string[];
    workspaceKey?: string;
    keywords?: string[];
    chartAction?: YearWorkspaceWorkflowAction | null;
    classification?: string | null;
    classificationLocked?: boolean | null;
    historicalTags?: string[] | null;
    workspaceKeys?: string[];
  };

  const year =
    typeof payload.year === "number" && payload.year >= 1900 && payload.year < 2100
      ? payload.year
      : OPS_FOCUS_YEAR;

  const op = payload.op?.trim();

  if (op && PRODUCER_OPS.has(op)) {
    const p = payload as Record<string, unknown>;
    const blockId = parseBlockId(p.blockId);

    if (op === "producerSetEraTargets") {
      const eraTargets = p.eraTargets;
      if (!eraTargets || typeof eraTargets !== "object") {
        return NextResponse.json({ error: "eraTargets required" }, { status: 400 });
      }
      const et = eraTargets as Record<string, unknown>;
      return producerOpError(year, () =>
        setProducerEraTargets(year, {
          1967: typeof et["1967"] === "number" ? et["1967"] : undefined,
          1978: typeof et["1978"] === "number" ? et["1978"] : undefined,
          1992: typeof et["1992"] === "number" ? et["1992"] : undefined,
        }),
      );
    }

    if (op === "producerSetBlockEra") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const eraId = parseProducerEraId(p.eraId);
      return producerOpError(year, () => setProducerBlockEra(year, blockId, eraId));
    }

    if (op === "producerSetTargetRuntime") {
      const targetRuntimeMinutes = p.targetRuntimeMinutes;
      if (
        typeof targetRuntimeMinutes !== "number" ||
        !Number.isFinite(targetRuntimeMinutes)
      ) {
        return NextResponse.json(
          { error: "targetRuntimeMinutes required" },
          { status: 400 },
        );
      }
      return producerOpError(year, () =>
        setProducerTargetRuntimeMinutes(year, targetRuntimeMinutes),
      );
    }

    if (op === "producerAddBlock") {
      const templateId = parseTemplateId(p.templateId);
      const afterBlockId = parseBlockId(p.afterBlockId);
      return producerOpError(year, () =>
        addProducerBlock(year, {
          afterBlockId: afterBlockId ?? undefined,
          templateId: templateId ?? undefined,
          title: typeof p.title === "string" ? p.title : undefined,
          notes:
            p.notes === null || typeof p.notes === "string"
              ? (p.notes as string | null)
              : undefined,
        }),
      );
    }

    if (op === "producerSetRuntimeOverride") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const timelineAssetId =
        typeof p.timelineAssetId === "string" ? p.timelineAssetId.trim() : "";
      if (!timelineAssetId) {
        return NextResponse.json(
          { error: "timelineAssetId required" },
          { status: 400 },
        );
      }
      const overrideRaw = p.runtimeOverrideSeconds;
      const runtimeOverrideSeconds =
        overrideRaw === null || overrideRaw === undefined
          ? null
          : typeof overrideRaw === "number" && Number.isFinite(overrideRaw)
            ? overrideRaw
            : NaN;
      if (Number.isNaN(runtimeOverrideSeconds as number) && overrideRaw != null) {
        return NextResponse.json(
          { error: "Invalid runtimeOverrideSeconds" },
          { status: 400 },
        );
      }
      return producerOpError(year, () =>
        setProducerRuntimeOverride(
          year,
          blockId,
          timelineAssetId,
          runtimeOverrideSeconds as number | null,
        ),
      );
    }

    if (op === "producerSetRuntimeApproval") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const timelineAssetId =
        typeof p.timelineAssetId === "string" ? p.timelineAssetId.trim() : "";
      if (!timelineAssetId) {
        return NextResponse.json(
          { error: "timelineAssetId required" },
          { status: 400 },
        );
      }
      if (typeof p.approvedRuntime !== "boolean") {
        return NextResponse.json(
          { error: "approvedRuntime boolean required" },
          { status: 400 },
        );
      }
      return producerOpError(year, () =>
        setProducerRuntimeApproval(
          year,
          blockId,
          timelineAssetId,
          p.approvedRuntime as boolean,
        ),
      );
    }

    if (op === "producerDuplicateBlock") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      return producerOpError(year, () => duplicateProducerBlock(year, blockId));
    }

    if (op === "producerRenameBlock") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const title = typeof p.title === "string" ? p.title : "";
      return producerOpError(year, () => renameProducerBlock(year, blockId, title));
    }

    if (op === "producerUpdateBlockNotes") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const notes =
        p.notes === null || typeof p.notes === "string"
          ? (p.notes as string | null)
          : null;
      return producerOpError(year, () =>
        updateProducerBlockNotes(year, blockId, notes),
      );
    }

    if (op === "producerDeleteBlock") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      return producerOpError(year, () => deleteProducerBlock(year, blockId));
    }

    if (op === "producerMoveBlock") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const direction = p.direction === "up" || p.direction === "down" ? p.direction : null;
      if (!direction) {
        return NextResponse.json({ error: "direction up|down required" }, { status: 400 });
      }
      return producerOpError(year, () => moveProducerBlock(year, blockId, direction));
    }

    if (op === "producerSetBlockCollapsed") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      if (typeof p.collapsed !== "boolean") {
        return NextResponse.json({ error: "collapsed boolean required" }, { status: 400 });
      }
      return producerOpError(year, () =>
        setProducerBlockCollapsed(year, blockId, p.collapsed as boolean),
      );
    }

    if (!blockId) {
      return NextResponse.json({ error: "blockId required" }, { status: 400 });
    }

    if (op === "producerRemoveFromBlock") {
      const timelineAssetId =
        typeof p.timelineAssetId === "string" ? p.timelineAssetId.trim() : "";
      if (!timelineAssetId) {
        return NextResponse.json(
          { error: "timelineAssetId required" },
          { status: 400 },
        );
      }
      return producerOpError(year, () =>
        removeAssetFromProducerBlock(year, blockId, timelineAssetId),
      );
    }

    if (op === "producerAddToBlock") {
      const asset = p.asset;
      if (!asset || typeof asset !== "object") {
        return NextResponse.json({ error: "asset required" }, { status: 400 });
      }
      const a = asset as Record<string, unknown>;
      const producerCategory = a.producerCategory;
      const productionCategory = a.productionCategory;
      const productionItemId = a.productionItemId;
      const title = a.title;
      if (
        typeof producerCategory !== "string" ||
        typeof productionCategory !== "string" ||
        typeof productionItemId !== "string" ||
        typeof title !== "string"
      ) {
        return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
      }
      const runtimeSeconds =
        typeof a.runtimeSeconds === "number" ? a.runtimeSeconds : 0;
      return producerOpError(year, () =>
        addAssetToProducerBlock(year, blockId, {
          producerCategory: producerCategory as Parameters<
            typeof addAssetToProducerBlock
          >[2]["producerCategory"],
          productionCategory: productionCategory as Parameters<
            typeof addAssetToProducerBlock
          >[2]["productionCategory"],
          productionItemId,
          title,
          subtitle: typeof a.subtitle === "string" ? a.subtitle : null,
          runtimeSeconds,
          approvedRuntime:
            typeof a.approvedRuntime === "boolean" ? a.approvedRuntime : undefined,
        }),
      );
    }

    return NextResponse.json({ error: `Unknown producer op: ${op}` }, { status: 400 });
  }

  if (op === "setReview") {
    const workspaceKey = payload.workspaceKey?.trim();
    if (!workspaceKey) {
      return NextResponse.json({ error: "workspaceKey required" }, { status: 400 });
    }

    const patch: ReviewRecordPatch = {};
    let hasField = false;

    if ("classification" in payload) {
      hasField = true;
      if (payload.classification == null) {
        patch.classification = null;
      } else if (
        typeof payload.classification === "string" &&
        isReviewClassification(payload.classification)
      ) {
        patch.classification = payload.classification;
      } else {
        return NextResponse.json({ error: "Invalid classification" }, { status: 400 });
      }
    }

    if ("classificationLocked" in payload) {
      hasField = true;
      patch.classificationLocked = payload.classificationLocked === true ? true : null;
    }

    if ("historicalTags" in payload) {
      hasField = true;
      if (payload.historicalTags == null) {
        patch.historicalTags = null;
      } else if (Array.isArray(payload.historicalTags)) {
        const tags = filterReviewUniverseTags(normalizeHistoricalTags(payload.historicalTags));
        const reviewRows = reviewUniverseEnabledForYear(year)
          ? (await loadReviewUniverse(year)).workspace.reviewRows
          : (await loadYearWorkspace(year)).reviewRows;
        const row = reviewRows.find((r) => r.workspaceKey === workspaceKey);
        const rvtr = normalizeRvtr(row?.rvtr ?? null);
        if (rvtr) {
          await saveRetroverseTagsForRvtr(rvtr, tags);
          patch.historicalTags = null;
        } else {
          patch.historicalTags = tags;
        }
      } else {
        return NextResponse.json({ error: "historicalTags must be an array" }, { status: 400 });
      }
    }

    if (!hasField) {
      return NextResponse.json(
        { error: "classification, classificationLocked, or historicalTags required" },
        { status: 400 },
      );
    }

    await saveYearReviewRecord(year, workspaceKey, patch);
    return NextResponse.json(
      reviewUniverseEnabledForYear(year)
        ? await reviewUniversePayload(year)
        : await fullPayload(year),
    );
  }

  if (op === "bulkSetClassification") {
    const workspaceKeys = Array.isArray(payload.workspaceKeys)
      ? payload.workspaceKeys
          .filter((k): k is string => typeof k === "string")
          .map((k) => k.trim())
          .filter(Boolean)
      : [];
    if (workspaceKeys.length === 0) {
      return NextResponse.json({ error: "workspaceKeys required" }, { status: 400 });
    }
    if (
      typeof payload.classification !== "string" ||
      !isReviewClassification(payload.classification)
    ) {
      return NextResponse.json({ error: "Invalid classification" }, { status: 400 });
    }
    await saveBulkClassification(year, workspaceKeys, payload.classification);
    return NextResponse.json(
      reviewUniverseEnabledForYear(year)
        ? await reviewUniversePayload(year)
        : await fullPayload(year),
    );
  }

  if (op) {
    const category = parseCategory(payload.category);
    if (!category) {
      return NextResponse.json({ error: "category required" }, { status: 400 });
    }

    if (op === "generateRecommendations" || op === "generateMoreRecommendations") {
      if (category === "songs") {
        return NextResponse.json(
          { error: "No recommendations for songs" },
          { status: 400 },
        );
      }
      const result = await appendCategoryRecommendations(year, category);
      return NextResponse.json({
        ...(await fullPayload(year)),
        recommendationResult: {
          added: result.added,
          remaining: result.remaining,
          poolTotal: result.poolTotal,
        },
      });
    }

    if (op === "itemAction") {
      const itemId = payload.itemId?.trim();
      const action = payload.productionAction;
      if (!itemId) {
        return NextResponse.json({ error: "itemId required" }, { status: 400 });
      }
      if (action !== "acquire" && action !== "skip" && action !== "approve") {
        return NextResponse.json({ error: "Invalid productionAction" }, { status: 400 });
      }
      await applyProductionItemAction(year, category, itemId, action);
      return NextResponse.json(await fullPayload(year));
    }

    if (op === "addAssets") {
      const filenames = Array.isArray(payload.filenames)
        ? payload.filenames.filter((f): f is string => typeof f === "string")
        : [];
      if (filenames.length === 0) {
        return NextResponse.json({ error: "filenames required" }, { status: 400 });
      }
      const queueItemId = payload.queueItemId?.trim() || undefined;
      await addProductionAssets(year, category, filenames, queueItemId);
      return NextResponse.json(await fullPayload(year));
    }

    if (op === "findSources") {
      const recommendationId = payload.recommendationId?.trim();
      if (!recommendationId) {
        return NextResponse.json({ error: "recommendationId required" }, { status: 400 });
      }
      const file = await loadCategoryProduction(year, category);
      const rec = file.items.find((i) => i.id === recommendationId);
      if (!rec || rec.kind !== "recommendation") {
        return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
      }
      const drawer = await findSourcesForRecommendation(
        year,
        category,
        recommendationId,
        rec.title,
      );
      return NextResponse.json({ ...(await fullPayload(year)), sourceDrawer: drawer });
    }

    if (op === "selectSource") {
      const recommendationId = payload.recommendationId?.trim();
      const sourceId = payload.sourceId?.trim();
      if (!recommendationId || !sourceId) {
        return NextResponse.json(
          { error: "recommendationId and sourceId required" },
          { status: 400 },
        );
      }
      const { loadCategorySources } = await import(
        "@/lib/ops/year-workspace/source-discovery/source-state"
      );
      const sources = await loadCategorySources(year, category);
      const candidate = sources.byRecommendation[recommendationId]?.find(
        (c) => c.id === sourceId,
      );
      if (!candidate) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }
      const file = await loadCategoryProduction(year, category);
      const rec = file.items.find((i) => i.id === recommendationId);
      if (!rec || rec.kind !== "recommendation") {
        return NextResponse.json({ error: "Recommendation not found" }, { status: 404 });
      }
      await enqueueFromSelectedSource(year, category, rec, candidate);
      return NextResponse.json(await fullPayload(year));
    }

    if (op === "rejectSource") {
      const recommendationId = payload.recommendationId?.trim();
      const sourceId = payload.sourceId?.trim();
      if (!recommendationId || !sourceId) {
        return NextResponse.json(
          { error: "recommendationId and sourceId required" },
          { status: 400 },
        );
      }
      await rejectSourceCandidate(year, category, recommendationId, sourceId);
      const file = await loadCategoryProduction(year, category);
      const rec = file.items.find((i) => i.id === recommendationId);
      const drawer = await findSourcesForRecommendation(
        year,
        category,
        recommendationId,
        rec?.title ?? "Recommendation",
      );
      return NextResponse.json({ ...(await fullPayload(year)), sourceDrawer: drawer });
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  }

  const workspaceKey = payload.workspaceKey?.trim();
  if (!workspaceKey) {
    return NextResponse.json({ error: "workspaceKey required" }, { status: 400 });
  }

  const hasKeywords = Array.isArray(payload.keywords);
  const hasChartAction = "chartAction" in payload;

  if (!hasKeywords && !hasChartAction) {
    return NextResponse.json(
      { error: "keywords or chartAction required" },
      { status: 400 },
    );
  }

  if (hasKeywords) {
    const keywords = normalizeYearWorkspaceKeywords(payload.keywords ?? []);
    await saveYearWorkspaceKeywords(year, workspaceKey, keywords);
  }

  if (hasChartAction) {
    const action = payload.chartAction ?? null;
    if (
      action != null &&
      action !== "acquire" &&
      action !== "skip" &&
      action !== "review"
    ) {
      return NextResponse.json({ error: "Invalid chartAction" }, { status: 400 });
    }
    await saveYearWorkspaceChartAction(year, workspaceKey, action);
  }

  return NextResponse.json(await fullPayload(year));
}
