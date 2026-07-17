import { notFound } from "next/navigation";
import { cookies } from "next/headers";

import { loadChartWeekContext } from "@/lib/charts/load-chart-week-context";
import { parseChartWeekDateParam } from "@/lib/charts/chart-week-portal-href";
import { formatChartDateLabel } from "@/lib/artist/chart-history-display";
import { OPS_GATE_COOKIE, isOpsEnabled } from "@/lib/ops/ops-gate";

import { ChartWeekPortalClient } from "./chart-week-portal-client";

import "./chart-week-portal.css";

type Props = {
  params: Promise<{ date: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const revalidate = 3600;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseRank(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const chartDate = parseChartWeekDateParam((await params).date);
  if (!chartDate) return { title: "Chart Week — RetroVerse" };
  const sp = await searchParams;
  const rank = parseRank(firstParam(sp.rank));
  const label = formatChartDateLabel(chartDate);
  return {
    title: rank != null ? `#${rank} · ${label} — RetroVerse` : `${label} — Chart Week — RetroVerse`,
  };
}

export default async function ChartWeekPortalPage({ params, searchParams }: Props) {
  const chartDate = parseChartWeekDateParam((await params).date);
  if (!chartDate) notFound();

  const sp = await searchParams;
  const focus = firstParam(sp.focus) ?? null;
  const rank = parseRank(firstParam(sp.rank));

  const hasFocus = Boolean(focus?.trim()) || rank != null;

  const context = await loadChartWeekContext({
    chartDate,
    focusTrackId: focus,
    rankHint: rank,
    ...(hasFocus ? { rangeFrom: 1, rangeTo: 100 } : {}),
  });

  if (!context) notFound();

  const cookieStore = await cookies();
  const operatorMode =
    isOpsEnabled() && cookieStore.get(OPS_GATE_COOKIE)?.value === "ok";

  return (
    <ChartWeekPortalClient
      initial={context}
      operatorMode={operatorMode}
    />
  );
}
