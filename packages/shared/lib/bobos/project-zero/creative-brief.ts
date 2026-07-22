import type { RvbrStyleDirective } from "@/lib/creative/rvbr-prompt-types";
import { DEFAULT_CREATIVE_DIRECTION_SETTINGS } from "@/lib/ops/content-creator/creative-direction";
import {
  normalizePassTypeLabel,
  type ControlledPassTypeLabel,
} from "@/lib/ops/creative-lab/pass-text-governance";

import type { PassWorkspaceSlug } from "./pass-workspace-slugs";
import { PASS_WORKSPACE_SLUGS } from "./pass-workspace-slugs";
import type { ProjectSharedContext } from "./types";

/**
 * The restored Content Creator brief — the same creative controls the old Content Creator
 * exposed (RVBR era, creative direction, governed text fields, anti-cliché toggles, notes),
 * owned per BobOS project. BobOS pre-fills it from the project's Shared Context; the user
 * can edit every field before generating. Nothing is hidden, nothing is hard-coded.
 */

/** Same default era Pass Studio's own generate route falls back to. */
export const DEFAULT_ERA_SLUG = "1982-1985";

/**
 * Production-tool creative controls — Style controls composition and design language,
 * Color Scheme controls palette. Together they form the RVBR style directive, the
 * strongest instruction in the generation prompt: two different styles must be
 * immediately recognizable as different families of artwork, and two color schemes
 * must produce clearly different palettes over the same design language.
 */
export type PassStyleId = "classic" | "bold" | "modern" | "playful" | "premium" | "minimal";

export type PassStyleOption = { id: PassStyleId; label: string; direction: string };

export const PASS_STYLE_OPTIONS: PassStyleOption[] = [
  {
    id: "classic",
    label: "Classic",
    direction:
      "CLASSIC — formal, timeless, symmetrical. Centered composition with a traditional engraved-certificate structure: ornamental rule lines, fine filigree borders, serif and engraved typography, medallions and laurel flourishes. Feels like a vintage theatre ticket or bank note. Calm, dignified, perfectly balanced — no wild angles, no abstract shapes.",
  },
  {
    id: "bold",
    label: "Bold",
    direction:
      "BOLD — loud, heavy, high-impact. Massive chunky display typography dominating the surface, thick outlines, oversized geometric blocks, hard diagonal cuts, extreme contrast between huge and small elements. Feels like a boxing-match poster or heavyweight gig flyer. Aggressive energy — nothing delicate, nothing subtle.",
  },
  {
    id: "modern",
    label: "Modern",
    direction:
      "MODERN — clean, graphic, contemporary. Asymmetric grid-driven layout, crisp sans-serif typography, flat color fields, precise geometric shapes, generous structured negative space, sharp editorial hierarchy. Feels like a contemporary design-festival identity. Ordered and confident — no ornament, no distressed texture, no vintage flourishes.",
  },
  {
    id: "playful",
    label: "Playful",
    direction:
      "PLAYFUL — fun, bouncy, hand-made. Tilted and wobbly hand-drawn lettering, cartoon shapes, stickers, squiggles, confetti, stars and doodle ornaments scattered with joyful chaos. Rounded corners and bubbly forms everywhere. Feels like a carnival flyer or an indie zine. Charming and irreverent — nothing formal, nothing straight, nothing corporate.",
  },
  {
    id: "premium",
    label: "Premium",
    direction:
      "PREMIUM — luxurious, refined, exclusive. Rich dark grounds with metallic foil accents, embossed seals, fine-line monograms, elegant high-contrast serif typography, satin gradients and subtle guilloché texture. Feels like a members-only club invitation or luxury product packaging. Restrained opulence — every element precise and expensive.",
  },
  {
    id: "minimal",
    label: "Minimal",
    direction:
      "MINIMAL — quiet, sparse, essential. One or two elements only on a nearly empty field: small precise typography, a single thin rule or small mark, vast intentional empty space. Feels like a gallery invitation. Absolute restraint — no decoration, no texture, no imagery beyond the essential mark.",
  },
];

export const DEFAULT_PASS_STYLE: PassStyleId = "classic";

export type PassColorSchemeId =
  | "purple-gold"
  | "neon-80s"
  | "red-black"
  | "blue-silver"
  | "orange-cream"
  | "green-gold"
  | "custom";

export type PassColorSchemeOption = {
  id: PassColorSchemeId;
  label: string;
  direction: string;
  /** Swatch used by the live text preview only — never sent to generation. */
  swatch: { primary: string; accent: string };
};

export const PASS_COLOR_SCHEME_OPTIONS: PassColorSchemeOption[] = [
  {
    id: "purple-gold",
    label: "Purple & Gold",
    direction:
      "Deep royal purple dominates every surface, with gleaming metallic gold for typography, borders, and accents. Ivory only for fine details.",
    swatch: { primary: "#3d1a6e", accent: "#e8b84b" },
  },
  {
    id: "neon-80s",
    label: "Neon 80s",
    direction:
      "Electric 1980s neon — hot magenta, cyan, and violet glowing against near-black. Sunset-gradient accents, luminous edges, saturated arcade energy.",
    swatch: { primary: "#16041f", accent: "#ff2ea6" },
  },
  {
    id: "red-black",
    label: "Red & Black",
    direction:
      "Blood red and jet black in hard contrast — red dominates large fields, black anchors typography and borders. White only as a knockout accent.",
    swatch: { primary: "#a30d18", accent: "#111111" },
  },
  {
    id: "blue-silver",
    label: "Blue & Silver",
    direction:
      "Deep midnight blue with cool metallic silver typography and details. Icy white highlights — a cold, polished, chrome-and-steel palette.",
    swatch: { primary: "#0d2451", accent: "#c3cdd9" },
  },
  {
    id: "orange-cream",
    label: "Orange & Cream",
    direction:
      "Warm burnt orange over soft cream paper tones. Chocolate brown for typography and fine lines — a warm, sun-faded, friendly palette.",
    swatch: { primary: "#d96a1e", accent: "#f6ead2" },
  },
  {
    id: "green-gold",
    label: "Green & Gold",
    direction:
      "Deep forest and emerald greens with rich metallic gold typography and ornament. Dark, verdant, and treasury-like.",
    swatch: { primary: "#0d4a2e", accent: "#d8a838" },
  },
  {
    id: "custom",
    label: "Custom",
    direction: "",
    swatch: { primary: "#3a3a3a", accent: "#bdbdbd" },
  },
];

export const DEFAULT_PASS_COLOR_SCHEME: PassColorSchemeId = "purple-gold";

export function passStyleById(id: string): PassStyleOption | null {
  return PASS_STYLE_OPTIONS.find((option) => option.id === id) ?? null;
}

export function passColorSchemeById(id: string): PassColorSchemeOption | null {
  return PASS_COLOR_SCHEME_OPTIONS.find((option) => option.id === id) ?? null;
}

function normalizePassStyle(raw: unknown): PassStyleId {
  return typeof raw === "string" && passStyleById(raw) ? (raw as PassStyleId) : DEFAULT_PASS_STYLE;
}

function normalizePassColorScheme(raw: unknown): PassColorSchemeId {
  return typeof raw === "string" && passColorSchemeById(raw)
    ? (raw as PassColorSchemeId)
    : DEFAULT_PASS_COLOR_SCHEME;
}

/** Per-pass-type creative controls — only the governed pass type label; composition and
 *  design language come from the shared Style + Color Scheme selection. */
export type PassSlotCreative = {
  passTypeLabel: ControlledPassTypeLabel;
};

export type PassCreativeBrief = {
  /** RVBR era slug — the visual language selector from the old Content Creator. */
  eraSlug: string;
  /** Style — controls composition and design language; the strongest prompt instruction. */
  style: PassStyleId;
  /** Color Scheme — controls the palette; second-strongest prompt instruction. */
  colorScheme: PassColorSchemeId;
  /** Free-text palette description, used only when colorScheme is "custom". */
  customColors: string;
  avoidEraTropes: boolean;
  maximizeVariation: boolean;
  /** Governed text fields — pre-filled from Shared Context, editable before generation. */
  event: string;
  venue: string;
  date: string;
  series: string;
  theme: string;
  /** Free-form creative notes fed to the prompt engine as director guidance. */
  notes: string;
  slots: Record<PassWorkspaceSlug, PassSlotCreative>;
};

export const DEFAULT_PASS_TYPE_LABEL_BY_SLUG: Record<PassWorkspaceSlug, ControlledPassTypeLabel> = {
  general: "GENERAL PASS",
  vip: "VIP PASS",
  backstage: "BACKSTAGE PASS",
};

function defaultSlots(): Record<PassWorkspaceSlug, PassSlotCreative> {
  const slots = {} as Record<PassWorkspaceSlug, PassSlotCreative>;
  for (const slug of PASS_WORKSPACE_SLUGS) {
    slots[slug] = {
      passTypeLabel: DEFAULT_PASS_TYPE_LABEL_BY_SLUG[slug],
    };
  }
  return slots;
}

/**
 * BobOS → Content Creator handoff: pre-fill the creative brief from the project's Shared
 * Context. This is the "Creative Cloud opens Photoshop with the project" moment — every
 * field arrives filled in and remains editable.
 */
export function seedCreativeBriefFromContext(context: ProjectSharedContext): PassCreativeBrief {
  return {
    eraSlug: DEFAULT_ERA_SLUG,
    style: DEFAULT_PASS_STYLE,
    colorScheme: DEFAULT_PASS_COLOR_SCHEME,
    customColors: context.colors ?? "",
    avoidEraTropes: DEFAULT_CREATIVE_DIRECTION_SETTINGS.avoidEraTropes,
    maximizeVariation: DEFAULT_CREATIVE_DIRECTION_SETTINGS.maximizeVariation,
    event: context.title,
    venue: context.venue,
    date: context.date,
    series: context.series ?? "",
    theme: context.theme,
    notes: context.notes ?? "",
    slots: defaultSlots(),
  };
}

/** Baseline brief with defaults and empty text — used to normalize persisted briefs. */
export function emptyCreativeBriefSeed(): PassCreativeBrief {
  return {
    eraSlug: DEFAULT_ERA_SLUG,
    style: DEFAULT_PASS_STYLE,
    colorScheme: DEFAULT_PASS_COLOR_SCHEME,
    customColors: "",
    avoidEraTropes: DEFAULT_CREATIVE_DIRECTION_SETTINGS.avoidEraTropes,
    maximizeVariation: DEFAULT_CREATIVE_DIRECTION_SETTINGS.maximizeVariation,
    event: "",
    venue: "",
    date: "",
    series: "",
    theme: "",
    notes: "",
    slots: defaultSlots(),
  };
}

function str(raw: unknown, fallback = ""): string {
  return typeof raw === "string" ? raw : fallback;
}

/** Tolerates missing/partial persisted briefs — every field falls back to its seed value. */
export function normalizeCreativeBrief(
  raw: unknown,
  seed: PassCreativeBrief,
): PassCreativeBrief {
  const parsed = (raw ?? {}) as Partial<PassCreativeBrief>;
  const slots = defaultSlots();
  for (const slug of PASS_WORKSPACE_SLUGS) {
    const slot = parsed.slots?.[slug];
    slots[slug] = {
      passTypeLabel: slot?.passTypeLabel
        ? normalizePassTypeLabel(slot.passTypeLabel)
        : DEFAULT_PASS_TYPE_LABEL_BY_SLUG[slug],
    };
  }
  return {
    eraSlug: str(parsed.eraSlug, seed.eraSlug) || seed.eraSlug,
    style: normalizePassStyle(parsed.style),
    colorScheme: normalizePassColorScheme(parsed.colorScheme),
    customColors: str(parsed.customColors, seed.customColors),
    avoidEraTropes: typeof parsed.avoidEraTropes === "boolean" ? parsed.avoidEraTropes : seed.avoidEraTropes,
    maximizeVariation:
      typeof parsed.maximizeVariation === "boolean" ? parsed.maximizeVariation : seed.maximizeVariation,
    event: str(parsed.event, seed.event),
    venue: str(parsed.venue, seed.venue),
    date: str(parsed.date, seed.date),
    series: str(parsed.series, seed.series),
    theme: str(parsed.theme, seed.theme),
    notes: str(parsed.notes, seed.notes),
    slots,
  };
}

/** Governed secondary line — series and theme woven into the single secondary text slot,
 *  matching how the old Content Creator used its Secondary Line field. */
export function secondaryLineFromBrief(brief: Pick<PassCreativeBrief, "series" | "theme">): string {
  return [brief.series.trim(), brief.theme.trim()].filter(Boolean).join(" · ");
}

/** The RVBR style directive — Style + Color Scheme as the strongest prompt instruction.
 *  Style dominates composition and design language; Color Scheme dominates palette;
 *  event data decorates the design rather than defining it. */
export function styleDirectiveFromBrief(
  brief: Pick<PassCreativeBrief, "style" | "colorScheme" | "customColors">,
): RvbrStyleDirective {
  const style = passStyleById(brief.style) ?? PASS_STYLE_OPTIONS[0]!;
  const scheme = passColorSchemeById(brief.colorScheme) ?? PASS_COLOR_SCHEME_OPTIONS[0]!;
  const customColors = brief.customColors.trim();
  const colorSchemeDirection =
    scheme.id === "custom"
      ? customColors || "Designer's choice — one dominant color plus one strong accent, applied consistently."
      : scheme.direction;
  return {
    styleLabel: style.label,
    styleDirection: style.direction,
    colorSchemeLabel: scheme.id === "custom" && customColors ? `Custom (${customColors})` : scheme.label,
    colorSchemeDirection,
  };
}

/** Shared VNext bridge for the production-facing Color Scheme selector. */
export function styleDirectiveForColorScheme(colorScheme: string): RvbrStyleDirective {
  const normalized = passColorSchemeById(colorScheme)?.id ?? DEFAULT_PASS_COLOR_SCHEME;
  return styleDirectiveFromBrief({
    style: DEFAULT_PASS_STYLE,
    colorScheme: normalized,
    customColors: "",
  });
}
