import { resolveStyleId } from "./style-selection";
import type { StyleCategory, StyleDefinition, StyleSelection, WeightedStyle } from "./types";

export const CREDENTIAL_STYLES: StyleDefinition[] = [
  { id: "festival-pass", label: "Festival Pass", category: "credential", description: "Multi-day festival credential with bold typography and perforated edge." },
  { id: "concert-credential", label: "Concert Credential", category: "credential", description: "Single-night concert laminate with artist and venue hierarchy." },
  { id: "press-pass", label: "Press Pass", category: "credential", description: "Media credential with editorial framing and access zones." },
  { id: "backstage-laminate", label: "Backstage Laminate", category: "credential", description: "High-security backstage pass with bold color blocking." },
  { id: "ticket-stub", label: "Ticket Stub", category: "credential", description: "Torn-stub admission ticket with date and seat metadata." },
  { id: "tv-studio-credential", label: "TV Studio Credential", category: "credential", description: "Broadcast studio guest pass with network-era styling." },
  { id: "trading-card", label: "Trading Card", category: "credential", description: "Collectible card frame with stats panel and foil accents." },
  { id: "magazine-cover", label: "Magazine Cover", category: "credential", description: "Newsstand cover layout with headline stack and cover lines." },
];

export const ILLUSTRATION_STYLES: StyleDefinition[] = [
  { id: "saturday-morning-cartoon", label: "Saturday Morning Cartoon", category: "illustration", description: "Bright cel animation, bold outlines, playful mascots, kid-show graphics." },
  { id: "comic-book", label: "Comic Book", category: "illustration", description: "Ink lines, halftone dots, action-panel dynamism." },
  { id: "mid-century", label: "Mid-Century", category: "illustration", description: "Atomic-age geometry, limited palettes, modernist optimism." },
  { id: "pop-art", label: "Pop Art", category: "illustration", description: "Ben-Day dots, high contrast, Warhol-era repetition." },
  { id: "psychedelic", label: "Psychedelic", category: "illustration", description: "Swirling forms, saturated gradients, 1960s poster energy." },
  { id: "rock-poster", label: "Rock Poster", category: "illustration", description: "Fillmore-era hand-lettering and psychedelic rock composition." },
  { id: "photographic", label: "Photographic", category: "illustration", description: "Hero photography with minimal graphic overlay." },
];

export const COLOR_STYLES: StyleDefinition[] = [
  { id: "cream-vintage", label: "Cream Vintage", category: "color", description: "Warm paper stock, cream grounds, muted ink accents." },
  { id: "bright-pop", label: "Bright Pop", category: "color", description: "High-saturation primaries, punchy contrast, candy colors." },
  { id: "muted-retro", label: "Muted Retro", category: "color", description: "Faded inks, sun-bleached tones, aged print feel." },
  { id: "earth-tone", label: "Earth Tones", category: "color", description: "Ochre, rust, olive, and brown natural palettes." },
  { id: "monochrome", label: "Monochrome", category: "color", description: "Single-ink or grayscale with one accent color." },
  { id: "neon", label: "Neon", category: "color", description: "Electric highlights on dark grounds, nightlife glow." },
];

export const DENSITY_STYLES: StyleDefinition[] = [
  { id: "simple", label: "Simple", category: "density", description: "Minimal fields, large type, generous whitespace." },
  { id: "medium", label: "Medium", category: "density", description: "Balanced metadata, clear hierarchy, moderate detail." },
  { id: "detailed", label: "Detailed", category: "density", description: "Rich metadata, fine rules, collector-grade density." },
];

export const STYLE_CATALOG: Record<StyleCategory, StyleDefinition[]> = {
  credential: CREDENTIAL_STYLES,
  illustration: ILLUSTRATION_STYLES,
  color: COLOR_STYLES,
  density: DENSITY_STYLES,
};

export function allStyleDefinitions(): StyleDefinition[] {
  return [
    ...CREDENTIAL_STYLES,
    ...ILLUSTRATION_STYLES,
    ...COLOR_STYLES,
    ...DENSITY_STYLES,
  ];
}

export function styleById(id: string): StyleDefinition | undefined {
  return allStyleDefinitions().find((s) => s.id === id);
}

export function emptyStyleSelection(): StyleSelection {
  return { credential: [], illustration: [], color: [], density: [] };
}

export function normalizeWeightedStyles(
  items: unknown,
  category: StyleCategory,
): WeightedStyle[] {
  if (!Array.isArray(items)) return [];
  const validIds = new Set(STYLE_CATALOG[category].map((s) => s.id));
  const merged = new Map<string, number>();
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as { id?: unknown; weight?: unknown };
    const rawId = typeof row.id === "string" ? row.id.trim() : "";
    const id = resolveStyleId(rawId);
    if (!id || !validIds.has(id)) continue;
    const weight = typeof row.weight === "number" ? Math.max(0, Math.min(100, row.weight)) : 0;
    if (weight <= 0) continue;
    merged.set(id, (merged.get(id) ?? 0) + weight);
  }
  return [...merged.entries()]
    .map(([id, weight]) => ({ id, weight: Math.min(100, weight) }))
    .sort((a, b) => b.weight - a.weight);
}

export function normalizeStyleSelection(raw: unknown): StyleSelection {
  if (!raw || typeof raw !== "object") return emptyStyleSelection();
  const obj = raw as Partial<StyleSelection>;
  return {
    credential: normalizeWeightedStyles(obj.credential, "credential"),
    illustration: normalizeWeightedStyles(obj.illustration, "illustration"),
    color: normalizeWeightedStyles(obj.color, "color"),
    density: normalizeWeightedStyles(obj.density, "density"),
  };
}

export function topWeightedStyles(
  selection: StyleSelection,
  category: StyleCategory,
  limit = 3,
): Array<{ id: string; label: string; weight: number }> {
  return [...selection[category]]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((w) => ({
      id: w.id,
      label: styleById(w.id)?.label ?? w.id,
      weight: w.weight,
    }));
}
