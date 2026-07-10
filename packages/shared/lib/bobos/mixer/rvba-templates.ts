/**
 * Broadcast (RVBA) asset templates — the built-in library of non-song assets
 * a deck can play: slides, announcements, countdowns, and similar graphics.
 * These are not searched from canonical data; they are a small fixed set an
 * operator drops straight onto a deck, each with its own default duration.
 */

import { RVBA_TYPE_LABELS, RVBA_TYPES, type RvbaType } from "@/lib/broadcast/rvba";

import type { AssetReference } from "./types";

/** RVBA types that make sense as a deck-playable broadcast asset in v1.
 * "now-playing" and "related" are engine-derived, not operator-selectable. */
const BROWSABLE_RVBA_TYPES: RvbaType[] = [
  "announcement",
  "countdown",
  "giveaway",
  "image",
  "pdf",
  "video",
  "story",
  "blank",
];

export type RvbaTemplate = AssetReference & { rvbaType: RvbaType; durationSeconds: number };

export const RVBA_TEMPLATES: RvbaTemplate[] = BROWSABLE_RVBA_TYPES.filter((type) =>
  RVBA_TYPES.includes(type),
).map((type) => ({
  assetId: `RVBA-${type.toUpperCase()}`,
  kind: "broadcast",
  title: RVBA_TYPE_LABELS[type],
  subtitle: "Broadcast asset",
  coverUrl: null,
  rvbaType: type,
  durationSeconds: type === "countdown" ? 0 : 20,
}));
