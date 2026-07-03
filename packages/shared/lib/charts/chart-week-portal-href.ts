const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseChartWeekDateParam(raw: string): string | null {
  const key = raw.trim().slice(0, 10);
  return RE_DATE.test(key) ? key : null;
}

/** Canonical chart week page — full Hot 100, or focused neighborhood when params set. */
export function chartWeekPortalHref(
  chartDate: string,
  params?: { focus?: string | null; rank?: number | null },
): string {
  const date = parseChartWeekDateParam(chartDate);
  if (!date) return "/rv/1978";
  const qs = new URLSearchParams();
  const focus = params?.focus?.trim();
  if (focus) qs.set("focus", focus);
  if (params?.rank != null && Number.isFinite(params.rank) && params.rank > 0) {
    qs.set("rank", String(Math.trunc(params.rank)));
  }
  const q = qs.toString();
  return q ? `/week/${date}?${q}` : `/week/${date}`;
}
