export function atlasMissionHref(rvtr: string | null | undefined): string {
  const id = rvtr?.trim().toUpperCase() ?? "";
  if (!id) return "/ops/atlas";
  return `/ops/atlas/mission/${encodeURIComponent(id)}`;
}
