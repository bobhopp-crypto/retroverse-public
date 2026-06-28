import type { VisualStyleId } from "@/lib/retroverse/visual-assets/types";

/** CSS filter hints for derived style preview (no generated images). */
export function derivedStylePreviewFilter(styleId: VisualStyleId | null): string | undefined {
  if (!styleId) return undefined;
  const filters: Record<string, string> = {
    charcoal_sketch: "grayscale(0.85) contrast(1.25)",
    colored_pencil: "saturate(1.15) contrast(1.05)",
    magazine_illustration: "contrast(1.1) saturate(0.95)",
    concert_poster: "contrast(1.3) saturate(1.2)",
    blueprint: "sepia(0.15) hue-rotate(180deg) saturate(0.7) contrast(1.1)",
    halftone_print: "contrast(1.2) grayscale(0.2)",
    airbrush_1980s: "saturate(1.25) brightness(1.05)",
    neon_poster: "saturate(1.5) contrast(1.2) brightness(0.95)",
    watercolor: "saturate(0.85) brightness(1.08) contrast(0.95)",
    television_scanline: "contrast(1.15) brightness(0.98)",
    screen_print: "contrast(1.35) saturate(1.1)",
    minimal_ink: "grayscale(1) contrast(1.4)",
    graphic_novel: "contrast(1.25) saturate(0.9)",
    vintage_editorial: "sepia(0.12) contrast(1.05)",
    album_jacket: "saturate(1.1) contrast(1.15)",
    monochrome_blue: "grayscale(0.5) sepia(0.2) hue-rotate(160deg) saturate(1.3)",
    pastel_illustration: "saturate(1.2) brightness(1.1) contrast(0.95)",
  };
  return filters[styleId];
}

export function sceneSuitabilityLabel(momentType: string, preferredTypes: string[]): string {
  if (preferredTypes.includes(momentType)) return "Ideal fit";
  const related = preferredTypes.some((t) => t.split("_")[0] === momentType.split("_")[0]);
  return related ? "Related fit" : "Experimental fit";
}
