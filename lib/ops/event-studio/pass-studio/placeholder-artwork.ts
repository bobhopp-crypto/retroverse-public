/** Client-safe overlay colors for PassFace — mirrors VARIANT_PALETTES in placeholder-artwork.server.ts */

type PassTypeSlug = "general" | "vip" | "backstage";

const OVERLAY_COLORS: Record<PassTypeSlug, { ink: string; bandInk: string }> = {
  general: { ink: "#0d1b2a", bandInk: "#f4edd8" },
  vip: { ink: "#fff8e7", bandInk: "#1a0a0a" },
  backstage: { ink: "#f0ecff", bandInk: "#121218" },
};

function slugFromPassType(passType: string): PassTypeSlug {
  const lower = passType.toLowerCase();
  if (lower.includes("backstage")) return "backstage";
  if (lower.includes("vip")) return "vip";
  return "general";
}

/** Text colors for serial/URL overlay on baked artwork. */
export function overlayColorsForPassType(passType: string): { ink: string; bandInk: string } {
  return OVERLAY_COLORS[slugFromPassType(passType)];
}
