export type AlbumCoverState = "missing" | "placeholder" | "low_res";

export function classifyAlbumCoverState(
  canonicalPath: string | null,
  linkCover: string | null,
  r2Key: string | null,
  reviewFlag: string | null,
): AlbumCoverState {
  const path = canonicalPath?.trim() || linkCover?.trim() || "";
  if (!path) return "missing";

  const flag = (reviewFlag || "").toLowerCase();
  if (flag === "pending" || flag === "review") return "low_res";

  return "placeholder";
}

export function chartRelevanceFromPeak(peak: number | null): "high" | "medium" | "low" {
  if (peak == null) return "low";
  if (peak <= 10) return "high";
  if (peak <= 40) return "medium";
  return "low";
}
