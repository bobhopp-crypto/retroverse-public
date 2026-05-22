export const CARD_COLORS = [
  { bg: "#9ee8e8", border: "#1a6b6b", label: "aqua" },
  { bg: "#ffb5a7", border: "#b83d2a", label: "coral" },
  { bg: "#b8f0d0", border: "#1f7a4a", label: "mint" },
  { bg: "#fff0a8", border: "#b8860b", label: "butter" },
  { bg: "#b8dcff", border: "#2a5f9e", label: "sky" },
  { bg: "#ffd4b8", border: "#c96a30", label: "peach" },
  { bg: "#ddd0ff", border: "#5c3d9e", label: "lavender" },
] as const;

export function cardColorForIndex(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}
