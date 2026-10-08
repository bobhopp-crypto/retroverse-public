import type { Rvba } from "@/lib/broadcast/rvba";
import { publicStageId, sanitizePublicCopy, hasPrivatePath } from "@/lib/retroverse/experience/public-copy";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";
import type { RendererCard } from "@/lib/universal-renderer/card-types";

import type { BroadcastAssetInput } from "./types";

function publicLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || !hasPrivatePath(trimmed)) return trimmed;
  return sanitizePublicCopy(trimmed);
}

function coverFromCards(cards: RendererCard[]): string | null {
  for (const card of cards) {
    if (card.kind === "hero" && card.coverUrl) return card.coverUrl;
    if (card.kind === "album" && card.coverUrl) return card.coverUrl;
  }
  return null;
}

function albumFromCards(cards: RendererCard[]): string | null {
  for (const card of cards) {
    if (card.kind === "album" && card.albumTitle.trim()) return card.albumTitle.trim();
    if (card.kind === "charts" && card.albumTitle?.trim()) return card.albumTitle.trim();
  }
  return null;
}

/** Build composer input from a loaded song package payload. */
export function extractBroadcastInputFromPackage(
  pkg: UniversalPackagePayload,
): BroadcastAssetInput {
  return {
    rvtr: publicStageId(pkg.rvtr),
    title: publicLabel(pkg.title),
    artist: publicLabel(pkg.artist),
    album: albumFromCards(pkg.cards),
    year: pkg.year,
    coverUrl: coverFromCards(pkg.cards),
  };
}

/** Fallback input from playhead RVBA when package metadata is still loading. */
export function extractBroadcastInputFromRvba(rvba: Rvba, songKey: string): BroadcastAssetInput {
  const title = publicLabel(rvba.title.trim() || rvba.link?.label?.trim() || "Now Playing");
  const artist = publicLabel(rvba.subtitle);
  return {
    rvtr: publicStageId(songKey),
    title,
    artist,
    album: null,
    year: null,
    coverUrl: null,
  };
}
