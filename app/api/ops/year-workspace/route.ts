import { NextResponse } from "next/server";

import { loadYearWorkspace } from "@/lib/ops/load-year-workspace";
import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
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
  loadProducerTimeline,
  removeAssetFromProducerBlock,
  setProducerRuntimeOverride,
  setProducerTargetRuntimeMinutes,
} from "@/lib/ops/year-workspace/producer/timeline-state";
import type {
  ProducerTimelineBlockId,
} from "@/lib/ops/year-workspace/producer/types";
import { PRODUCER_TIMELINE_BLOCKS } from "@/lib/ops/year-workspace/producer/config";
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

const PRODUCER_BLOCK_IDS = new Set(
  PRODUCER_TIMELINE_BLOCKS.map((b) => b.id),
);

function parseProducerBlock(value: unknown): ProducerTimelineBlockId | null {
  if (typeof value !== "string") return null;
  return PRODUCER_BLOCK_IDS.has(value as ProducerTimelineBlockId)
    ? (value as ProducerTimelineBlockId)
    : null;
}

async function fullPayload(year: number) {
  const workspace = await loadYearWorkspace(year);
  const bundle = await loadYearWorkspaceProductionBundleForYear(
    year,
    workspace.completion,
  );
  const keywordState = await loadYearWorkspaceState(year);
  const producerTimeline = await loadProducerTimeline(year);
  return {
    ok: true as const,
    year,
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
    },
  };
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

  return NextResponse.json(await fullPayload(year));
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
  };

  const year =
    typeof payload.year === "number" && payload.year >= 1900 && payload.year < 2100
      ? payload.year
      : OPS_FOCUS_YEAR;

  const op = payload.op?.trim();

  if (
    op === "producerAddToBlock" ||
    op === "producerRemoveFromBlock" ||
    op === "producerSetTargetRuntime" ||
    op === "producerSetRuntimeOverride"
  ) {
    const blockId = parseProducerBlock(
      (payload as { blockId?: string }).blockId,
    );

    if (op === "producerSetTargetRuntime") {
      const targetRuntimeMinutes = (payload as { targetRuntimeMinutes?: number })
        .targetRuntimeMinutes;
      if (
        typeof targetRuntimeMinutes !== "number" ||
        !Number.isFinite(targetRuntimeMinutes)
      ) {
        return NextResponse.json(
          { error: "targetRuntimeMinutes required" },
          { status: 400 },
        );
      }
      try {
        await setProducerTargetRuntimeMinutes(year, targetRuntimeMinutes);
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Invalid target" },
          { status: 400 },
        );
      }
      return NextResponse.json(await fullPayload(year));
    }

    if (op === "producerSetRuntimeOverride") {
      if (!blockId) {
        return NextResponse.json({ error: "blockId required" }, { status: 400 });
      }
      const timelineAssetId = (payload as { timelineAssetId?: string })
        .timelineAssetId?.trim();
      if (!timelineAssetId) {
        return NextResponse.json(
          { error: "timelineAssetId required" },
          { status: 400 },
        );
      }
      const overrideRaw = (payload as { runtimeOverrideSeconds?: unknown })
        .runtimeOverrideSeconds;
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
      try {
        await setProducerRuntimeOverride(
          year,
          blockId,
          timelineAssetId,
          runtimeOverrideSeconds as number | null,
        );
      } catch (err) {
        return NextResponse.json(
          { error: err instanceof Error ? err.message : "Update failed" },
          { status: 400 },
        );
      }
      return NextResponse.json(await fullPayload(year));
    }

    if (!blockId) {
      return NextResponse.json({ error: "blockId required" }, { status: 400 });
    }
    if (op === "producerAddToBlock") {
      const asset = (payload as { asset?: Record<string, unknown> }).asset;
      if (!asset || typeof asset !== "object") {
        return NextResponse.json({ error: "asset required" }, { status: 400 });
      }
      const producerCategory = asset.producerCategory;
      const productionCategory = asset.productionCategory;
      const productionItemId = asset.productionItemId;
      const title = asset.title;
      if (
        typeof producerCategory !== "string" ||
        typeof productionCategory !== "string" ||
        typeof productionItemId !== "string" ||
        typeof title !== "string"
      ) {
        return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
      }
      const runtimeSeconds =
        typeof asset.runtimeSeconds === "number" ? asset.runtimeSeconds : undefined;
      await addAssetToProducerBlock(year, blockId, {
        producerCategory: producerCategory as Parameters<
          typeof addAssetToProducerBlock
        >[2]["producerCategory"],
        productionCategory: productionCategory as Parameters<
          typeof addAssetToProducerBlock
        >[2]["productionCategory"],
        productionItemId,
        title,
        subtitle:
          typeof asset.subtitle === "string" ? asset.subtitle : null,
        runtimeSeconds:
          typeof runtimeSeconds === "number" ? runtimeSeconds : 0,
      });
      return NextResponse.json(await fullPayload(year));
    }
    const timelineAssetId = (payload as { timelineAssetId?: string })
      .timelineAssetId?.trim();
    if (!timelineAssetId) {
      return NextResponse.json(
        { error: "timelineAssetId required" },
        { status: 400 },
      );
    }
    await removeAssetFromProducerBlock(year, blockId, timelineAssetId);
    return NextResponse.json(await fullPayload(year));
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
