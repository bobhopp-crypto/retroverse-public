import { NextResponse } from "next/server";

import { loadYearWorkspace } from "@/lib/ops/load-year-workspace";
import { OPS_FOCUS_YEAR } from "@/lib/ops/load-ops-data";
import {
  loadYearWorkspaceState,
  saveYearWorkspaceChartAction,
  saveYearWorkspaceKeywords,
} from "@/lib/ops/year-workspace/state";
import type { YearWorkspaceWorkflowAction } from "@/lib/ops/year-workspace/types";
import {
  normalizeYearWorkspaceKeywords,
  YEAR_WORKSPACE_KEYWORDS,
} from "@/lib/ops/year-workspace/vocabulary";
import { inspectPing } from "@/lib/inspect/pg";

export const dynamic = "force-dynamic";

function parseYear(value: string | null): number {
  const y = Number(value);
  if (Number.isFinite(y) && y >= 1900 && y < 2100) return y;
  return OPS_FOCUS_YEAR;
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

  const [workspace, keywordState] = await Promise.all([
    loadYearWorkspace(year),
    loadYearWorkspaceState(year),
  ]);

  return NextResponse.json({
    ok: true,
    year,
    workspace,
    vocabulary: YEAR_WORKSPACE_KEYWORDS,
    keywordState: {
      updatedAt: keywordState.updatedAt,
      assignedCount: Object.keys(keywordState.keywords).length,
    },
  });
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
    workspaceKey?: string;
    keywords?: string[];
    chartAction?: YearWorkspaceWorkflowAction | null;
  };

  const year =
    typeof payload.year === "number" && payload.year >= 1900 && payload.year < 2100
      ? payload.year
      : OPS_FOCUS_YEAR;

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

  let keywordState = await loadYearWorkspaceState(year);

  if (hasKeywords) {
    const keywords = normalizeYearWorkspaceKeywords(payload.keywords ?? []);
    keywordState = await saveYearWorkspaceKeywords(year, workspaceKey, keywords);
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
    keywordState = await saveYearWorkspaceChartAction(year, workspaceKey, action);
  }

  const workspace = await loadYearWorkspace(year);

  return NextResponse.json({
    ok: true,
    year,
    workspaceKey,
    keywords: hasKeywords
      ? normalizeYearWorkspaceKeywords(payload.keywords ?? [])
      : undefined,
    chartAction: hasChartAction ? (payload.chartAction ?? null) : undefined,
    keywordState: {
      updatedAt: keywordState.updatedAt,
      assignedCount: Object.keys(keywordState.keywords).length,
      chartActionCount: Object.keys(keywordState.chartActions).length,
    },
    workspace,
  });
}
