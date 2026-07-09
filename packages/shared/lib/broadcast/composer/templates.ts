import type { BroadcastTemplateDefinition, TemplateId } from "./types";

/**
 * Theme Pack 1 — twelve phone (9:16) broadcast layouts.
 * Typography and spacing tokens are shared; only region placement differs.
 */
export const THEME_PACK_1_TEMPLATES: readonly BroadcastTemplateDefinition[] = [
  {
    id: 1,
    slug: "classic-stack",
    name: "Classic Stack",
    layoutClass: "bac--t01",
    description: "Hero band top, cover center, metadata bottom.",
  },
  {
    id: 2,
    slug: "cover-crown",
    name: "Cover Crown",
    layoutClass: "bac--t02",
    description: "Large cover upper crown, metadata anchored low.",
  },
  {
    id: 3,
    slug: "side-stage",
    name: "Side Stage",
    layoutClass: "bac--t03",
    description: "Cover left column, song metadata right column.",
  },
  {
    id: 4,
    slug: "full-bleed",
    name: "Full Bleed",
    layoutClass: "bac--t04",
    description: "Cover fills frame with cinematic scrim, meta lower third.",
  },
  {
    id: 5,
    slug: "documentary",
    name: "Documentary",
    layoutClass: "bac--t05",
    description: "Compact cover badge, editorial title block lower half.",
  },
  {
    id: 6,
    slug: "cinematic",
    name: "Cinematic",
    layoutClass: "bac--t06",
    description: "Wide hero wash, floating cover, broadcast lower third.",
  },
  {
    id: 7,
    slug: "gallery",
    name: "Gallery",
    layoutClass: "bac--t07",
    description: "Cover on pedestal center, metadata above and below.",
  },
  {
    id: 8,
    slug: "midnight",
    name: "Midnight",
    layoutClass: "bac--t08",
    description: "Deep midnight field, cover mid-right, meta left-bottom.",
  },
  {
    id: 9,
    slug: "broadcast-purple",
    name: "Broadcast Purple",
    layoutClass: "bac--t09",
    description: "Purple accent rails, centered cover, stacked meta.",
  },
  {
    id: 10,
    slug: "electric-cyan",
    name: "Electric Cyan",
    layoutClass: "bac--t10",
    description: "Cyan glow kicker, bottom-weighted cover and meta.",
  },
  {
    id: 11,
    slug: "warm-amber",
    name: "Warm Amber",
    layoutClass: "bac--t11",
    description: "Amber hero wash, cover upper third, meta lower.",
  },
  {
    id: 12,
    slug: "spotlight",
    name: "Spotlight",
    layoutClass: "bac--t12",
    description: "Radial spotlight on cover, meta in lower third.",
  },
] as const;

const BY_ID = new Map<TemplateId, BroadcastTemplateDefinition>(
  THEME_PACK_1_TEMPLATES.map((t) => [t.id, t]),
);

export function getTemplateDefinition(id: TemplateId): BroadcastTemplateDefinition {
  return BY_ID.get(id) ?? THEME_PACK_1_TEMPLATES[0]!;
}

export const TEMPLATE_COUNT = THEME_PACK_1_TEMPLATES.length;
