import { styleById } from "./style-catalog";
import type { ConceptVariationKey, CreativeLabModuleId, StyleSelection } from "./types";

export type ConceptStrategyId =
  | "credential-focus"
  | "collector-focus"
  | "broadcast-focus"
  | "festival-focus";

export type ConceptStrategyMap = Record<ConceptVariationKey, ConceptStrategyId>;

export const CONCEPT_STRATEGY_IDS: ConceptStrategyId[] = [
  "credential-focus",
  "collector-focus",
  "broadcast-focus",
  "festival-focus",
];

export const DEFAULT_CONCEPT_STRATEGIES: ConceptStrategyMap = {
  A: "credential-focus",
  B: "festival-focus",
  C: "broadcast-focus",
  D: "collector-focus",
};

export type StrategyRenderContext = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
  theme: string;
  module: CreativeLabModuleId;
  styleSelection: StyleSelection;
  variationKey?: ConceptVariationKey;
};

export type ConceptStrategyTemplate = {
  id: ConceptStrategyId;
  label: string;
  description: string;
};

export const CONCEPT_STRATEGY_TEMPLATES: ConceptStrategyTemplate[] = [
  {
    id: "credential-focus",
    label: "Credential Focus",
    description: "Authentic credential / backstage emphasis — laminate structure, access zones, security cues.",
  },
  {
    id: "collector-focus",
    label: "Collector Focus",
    description: "Numbered collectible / keepsake emphasis — edition marks, foil, archival presentation.",
  },
  {
    id: "broadcast-focus",
    label: "Broadcast Focus",
    description: "Television network / production emphasis — ON AIR badges, studio lighting, guest plates.",
  },
  {
    id: "festival-focus",
    label: "Festival Focus",
    description: "Event and crowd experience emphasis — multi-day energy, marquee typography, field wear.",
  },
];

function topLabel(selection: StyleSelection, category: keyof StyleSelection): string {
  const top = selection[category][0];
  return top ? (styleById(top.id)?.label ?? top.id) : "unspecified";
}

function secondaryLinePhrase(line: string): string {
  const trimmed = line.trim();
  return trimmed || "the event subtitle";
}

export function normalizeConceptStrategyMap(raw: unknown): ConceptStrategyMap {
  const fallback = { ...DEFAULT_CONCEPT_STRATEGIES };
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Partial<Record<ConceptVariationKey, unknown>>;
  const valid = new Set(CONCEPT_STRATEGY_IDS);
  for (const key of ["A", "B", "C", "D"] as const) {
    const v = obj[key];
    if (typeof v === "string" && valid.has(v as ConceptStrategyId)) {
      fallback[key] = v as ConceptStrategyId;
    }
  }
  return fallback;
}

export function normalizeConceptStrategyId(raw: unknown): ConceptStrategyId {
  if (typeof raw === "string" && CONCEPT_STRATEGY_IDS.includes(raw as ConceptStrategyId)) {
    return raw as ConceptStrategyId;
  }
  return "credential-focus";
}

export function strategyForVariation(
  map: ConceptStrategyMap | undefined,
  key: ConceptVariationKey | undefined,
): ConceptStrategyId {
  if (key && map?.[key]) return map[key];
  if (key && DEFAULT_CONCEPT_STRATEGIES[key]) return DEFAULT_CONCEPT_STRATEGIES[key];
  return "credential-focus";
}

export function strategyById(id: ConceptStrategyId): ConceptStrategyTemplate {
  return CONCEPT_STRATEGY_TEMPLATES.find((s) => s.id === id) ?? CONCEPT_STRATEGY_TEMPLATES[0];
}

/** Strategy-specific prompt blocks — materially different per concept. */
export function renderStrategySections(
  strategyId: ConceptStrategyId,
  ctx: StrategyRenderContext,
): string[] {
  const cred = topLabel(ctx.styleSelection, "credential");
  const illust = topLabel(ctx.styleSelection, "illustration");
  const color = topLabel(ctx.styleSelection, "color");
  const density = topLabel(ctx.styleSelection, "density");
  const years = secondaryLinePhrase(ctx.secondaryLine);
  const tpl = strategyById(strategyId);

  const shared = [
    `=== Concept Strategy: ${tpl.label} ===`,
    tpl.description,
    `Primary credential format: ${cred}. Illustration direction: ${illust}. Palette: ${color}. Density: ${density}.`,
  ];

  switch (strategyId) {
    case "credential-focus":
      return [
        ...shared,
        "",
        "=== Composition Priority ===",
        `Hero layout: ${cred} as the dominant readable object — lanyard hole, access tier label, and venue/date lockup visible at a glance.`,
        `Feature ${ctx.event} and ${ctx.venue} in the credential header stack; ${ctx.date} as authoritative metadata, not decorative copy.`,
        `Backstage authenticity: security stripe, laminate edge glow, and role badge (CREW / PRESS / VIP) appropriate to ${years}.`,
        "",
        "=== Visual Directives ===",
        `Illustration supports the credential frame — ${illust} accents inside the pass border, not a full-bleed poster behind small type.`,
        `Negative space reserved for readable name plate and barcode / QR zone.`,
        "",
        "=== Print & Finish ===",
        `${density} metadata density — every field earns its place. Crisp vector rules, no muddy gradients on small type.`,
        "Simulate thermal laminate with subtle edge highlight; avoid glossy stock-template clichés.",
        "",
        "=== Collectibility Hook ===",
        "Feels like a credential pulled from a road case — legitimate wear at corners, not distressed filter.",
      ];
    case "collector-focus":
      return [
        ...shared,
        "",
        "=== Composition Priority ===",
        `Present as a numbered keepsake — limited edition callout, foil stamp zone, and ${cred} frame treated like a trading artifact.`,
        `Center ${ctx.event} as the collectible title; ${ctx.venue} and ${ctx.date} as certificate metadata along the lower third.`,
        `Edition logic: suggest serial numbering, holographic accent, or embossed seal tied to ${years}.`,
        "",
        "=== Visual Directives ===",
        `${illust} rendered as premium card art — border ornaments, stat panel, or inset portrait with collector-grade line work.`,
        `Color palette ${color} supports foil contrast — metallics and spot highlights over flat fills.`,
        "",
        "=== Print & Finish ===",
        `${density} field layout with archival caption lines — origin story, event year, and preservation notes.`,
        "Show sleeve-ready proportions; strong silhouette when photographed on a shelf.",
        "",
        "=== Collectibility Hook ===",
        "Must read as something worth saving — not disposable merch. Tactile depth, intentional hierarchy, no clip-art badges.",
      ];
    case "broadcast-focus":
      return [
        ...shared,
        "",
        "=== Composition Priority ===",
        `Television production guest pass — ON AIR / STUDIO ACCESS badge, network-era framing, and ${cred} proportions tuned for camera-safe margins.`,
        `Lead with broadcast context for ${ctx.event} at ${ctx.venue}; ${ctx.date} in production slate typography.`,
        `Include guest name plate zone, show logo placeholder, and subtle scan-line or studio-floor texture from ${years}.`,
        "",
        "=== Visual Directives ===",
        `${illust} with broadcast graphic language — lower-third energy, title-card boldness, studio spotlight on hero subject.`,
        `Palette ${color} under studio lighting — readable on camera monitors and printed laminate.`,
        "",
        "=== Print & Finish ===",
        `${density} studio metadata — show title, segment, tap time, and clearance line in broadcast hierarchy.`,
        "Gloss laminate simulation; high contrast type for control-room legibility.",
        "",
        "=== Collectibility Hook ===",
        "Feels like a pass from the tape vault — production-authentic, not fan-fiction novelty.",
      ];
    case "festival-focus":
      return [
        ...shared,
        "",
        "=== Composition Priority ===",
        `Festival-field credential — perforated stub logic, multi-day wristband energy, and ${cred} hierarchy built for crowd scale.`,
        `Marquee typography for ${ctx.event}; ${ctx.venue} as the anchor venue; ${ctx.date} and ${years} as the nostalgia timeline.`,
        `Suggest gate entry, sunset crowd silhouette, or day-badge color coding without cluttering the pass face.`,
        "",
        "=== Visual Directives ===",
        `${illust} at poster scale inside the pass — hand-lettered energy, field-used ink, joyful chaos contained by ${density} rules.`,
        `Palette ${color} sun-bleached and field-authentic — readable after a long night outdoors.`,
        "",
        "=== Print & Finish ===",
        `${density} festival metadata — day line-up tease, access tier, and tear-off stub alignment marks.`,
        "Paper stock feels like heavy festival stock — not office laminate.",
        "",
        "=== Collectibility Hook ===",
        "Survived the show — light corner bend, legitimate patina, still proud on a cork board.",
      ];
    default:
      return shared;
  }
}
