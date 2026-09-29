import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { ChartWeekPortalContext } from "@/lib/charts/chart-week-portal-types";

type WeekMap = Record<string, ChartWeekPortalContext>;
const cache = new Map<string, Promise<WeekMap | null>>();
const CACHE_LIMIT = 3;

async function loadYear(year: string): Promise<WeekMap | null> {
  let pending = cache.get(year);
  if (!pending) {
    pending = readFile(join(process.cwd(), "data/static-graph/weeks", `${year}.json.gz`))
      .then((bytes) => JSON.parse(gunzipSync(bytes).toString("utf8")) as WeekMap)
      .catch((error: NodeJS.ErrnoException) => {
        cache.delete(year);
        if (error.code === "ENOENT") return null;
        throw error;
      });
    cache.set(year, pending);
    while (cache.size > CACHE_LIMIT) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
  }
  return pending;
}

export async function loadStaticChartWeekContext(params: {
  chartDate: string;
  focusTrackId?: string | null;
  rankHint?: number | null;
  radius?: number;
  rangeFrom?: number;
  rangeTo?: number;
}): Promise<ChartWeekPortalContext | null> {
  const chartDate = params.chartDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(chartDate)) return null;
  const full = (await loadYear(chartDate.slice(0, 4)))?.[chartDate];
  if (!full) return null;

  const focusToken = params.focusTrackId?.trim().toUpperCase();
  const focusRow = (params.rankHint != null && params.rankHint >= 1 && params.rankHint <= 100
    ? full.rows.find((row) => row.position === params.rankHint)
    : undefined) ?? (focusToken
    ? full.rows.find((row) => row.rvtr?.toUpperCase() === focusToken || row.trackId.toUpperCase() === focusToken)
    : undefined);
  const hasFocus = Boolean(focusToken) || (params.rankHint != null && params.rankHint >= 1 && params.rankHint <= 100);
  const focusPosition = hasFocus ? (focusRow?.position ?? params.rankHint ?? null) : null;
  if (hasFocus && (focusPosition == null || focusPosition < full.chartMin || focusPosition > full.chartMax)) return null;

  const radius = Math.max(1, Math.min(25, params.radius ?? 3));
  const hasExplicitRange = params.rangeFrom != null || params.rangeTo != null;
  let rangeFrom = params.rangeFrom != null ? Math.max(full.chartMin, params.rangeFrom) :
    hasExplicitRange || !hasFocus ? full.chartMin : Math.max(full.chartMin, focusPosition! - radius);
  let rangeTo = params.rangeTo != null ? Math.min(full.chartMax, params.rangeTo) :
    hasExplicitRange || !hasFocus ? full.chartMax : Math.min(full.chartMax, focusPosition! + radius);
  if (rangeFrom > rangeTo) {
    rangeFrom = hasFocus ? Math.max(full.chartMin, focusPosition! - radius) : full.chartMin;
    rangeTo = hasFocus ? Math.min(full.chartMax, focusPosition! + radius) : full.chartMax;
  }
  const rows = full.rows.filter((row) => row.position >= rangeFrom && row.position <= rangeTo);
  if (!rows.length) return null;

  return {
    ...full,
    focusPosition,
    focusTrackId: focusRow?.trackId ?? params.focusTrackId ?? null,
    focusTitle: focusRow?.title ?? null,
    focusArtist: focusRow?.artistName ?? null,
    rows,
    rangeFrom,
    rangeTo,
  };
}
