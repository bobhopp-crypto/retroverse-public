export type ClusterPaletteEntry = {
  id: string;
  color: string;
  bg: string;
  name: string;
  glyph: string;
};

/** Stable scan palette — suggestions only, never persisted. */
export const CLUSTER_PALETTE: ClusterPaletteEntry[] = [
  { id: "green", color: "#1f8f4a", bg: "#2ecc71", name: "Green", glyph: "🟩" },
  { id: "purple", color: "#6b21a8", bg: "#a855f7", name: "Purple", glyph: "🟪" },
  { id: "gold", color: "#92600a", bg: "#f0b429", name: "Gold", glyph: "🟨" },
  { id: "blue", color: "#1d4ed8", bg: "#3b9eff", name: "Blue", glyph: "🟦" },
  { id: "pink", color: "#be185d", bg: "#ff6eb4", name: "Pink", glyph: "🩷" },
  { id: "orange", color: "#c2410c", bg: "#ff9f43", name: "Orange", glyph: "🟧" },
  { id: "teal", color: "#0f766e", bg: "#2eb8b8", name: "Teal", glyph: "🩵" },
  { id: "red", color: "#b91c1c", bg: "#ef4444", name: "Red", glyph: "🟥" },
];

export function paletteGlyph(clusterId: string): string {
  return CLUSTER_PALETTE.find((p) => p.id === clusterId.split("-")[0])?.glyph ?? "⬜";
}
