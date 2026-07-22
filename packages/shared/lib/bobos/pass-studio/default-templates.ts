import "server-only";

import type { ProductionBinder } from "@/lib/ops/event-studio/types";

import { findLatestPassArtworkBySlug } from "./content-creator-artwork";
import { eventIdFromName } from "./event-id";
import { loadPassTemplates, savePassTemplate } from "./store";
import type { PassTemplate } from "./types";

export { eventIdFromName } from "./event-id";

type DefaultPassTypeSpec = {
  slug: "general" | "vip" | "backstage";
  name: string;
  primary: string;
  accent: string;
};

const DEFAULT_PASS_TYPES: DefaultPassTypeSpec[] = [
  { slug: "general", name: "General", primary: "#1a0f2e", accent: "#2eb8b8" },
  { slug: "vip", name: "VIP", primary: "#2b1810", accent: "#ff7a45" },
  { slug: "backstage", name: "Backstage", primary: "#10161c", accent: "#c494ff" },
];

export function defaultTemplateId(eventId: string, slug: string): string {
  return `default-${eventId}-${slug}`;
}

/**
 * Producer-driven defaults — colors follow the event's RVBR palette when available.
 * Artwork is never generated here: each default design points at the latest matching
 * generation in the Content Creator library (the single shared BobOS artwork source).
 * If no matching generation exists yet, the design is created with no artwork and
 * Pass Studio shows a "Generate Artwork" prompt instead of a placeholder.
 */
export async function buildDefaultPassTemplates(binder: ProductionBinder): Promise<PassTemplate[]> {
  const eventId = eventIdFromName(binder.snapshot.eventName);
  const swatches = binder.identity.colorSwatches.filter(Boolean);
  const now = new Date().toISOString();
  const artworkBySlug = await findLatestPassArtworkBySlug();

  return DEFAULT_PASS_TYPES.map((spec) => {
    const palette = {
      primary: swatches[0] || spec.primary,
      accent: swatches[1] || swatches[0] || spec.accent,
      secondary: "#ffffff",
    };
    const match = artworkBySlug[spec.slug];

    return {
      id: defaultTemplateId(eventId, spec.slug),
      name: `${spec.name} Pass`,
      generationId: match?.generationId ?? null,
      frontArtworkUrl: match?.frontArtworkUrl ?? null,
      backArtworkUrl: match?.backArtworkUrl ?? null,
      colors: { primary: palette.primary, secondary: palette.secondary, accent: palette.accent },
      fonts: { heading: "Georgia", body: "Arial" },
      qrPosition: { side: "back", xPct: 68, yPct: 68, sizePct: 24 },
      logoUrl: null,
      backgroundUrl: null,
      style: binder.identity.styleProfile || `${spec.name} Pass`,
      createdAt: now,
      updatedAt: now,
    };
  });
}

/**
 * Pass Studio should never show "no templates yet" for normal production.
 * If the library is empty, seed it once with General / VIP / Backstage rows,
 * auto-matched against existing Content Creator artwork where available.
 */
export async function ensureDefaultPassTemplates(binder: ProductionBinder): Promise<PassTemplate[]> {
  const existing = await loadPassTemplates();
  if (existing.length > 0) return existing;

  const defaults = await buildDefaultPassTemplates(binder);
  for (const template of defaults) {
    await savePassTemplate(template);
  }
  return defaults;
}
