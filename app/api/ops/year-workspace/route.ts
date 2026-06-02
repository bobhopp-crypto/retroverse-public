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
import { YEAR_WORKSPACE_CATEGORIES } from "@/lib/ops/year-workspace/types";
import {
  normalizeYearWorkspaceKeywords,
  YEAR_WORKSPACE_KEYWORDS,
} from "@/lib/ops/year-workspace/vocabulary";
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
  const categories = YEAR_WORKSPACE_CATEGORIES.filter((c) => c.id !== "songs");
  const pools: Record<string, { total: number; remaining: number }> = {};
  for (const { id } of categories) {
    const ids = new Set(production[id].items.map((i) => i.id));
    const stats = curatedPoolStats(year, id, ids);
    pools[id] = stats;
  }
  return pools;
}

async function fullPayload(year: number) {
  const workspace = await loadYearWorkspace(year);
  const bundle = await loadYearWorkspaceProductionBundleForYear(
    year,
    workspace.completion,
  );
  const keywordState = await loadYearWorkspaceState(year);
  return {
    ok: true as const,
    year,
    workspace,
    production: bundle.production,
    summary: bundle.summary,
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
