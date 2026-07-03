/** High-contrast text on cluster card backgrounds. */
export function contrastTextOnBg(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "#141210";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.58 ? "#141210" : "#ffffff";
}

export function clusterSortKey(clusterId: string | null | undefined): string {
  if (!clusterId) return "zzz";
  return clusterId;
}
