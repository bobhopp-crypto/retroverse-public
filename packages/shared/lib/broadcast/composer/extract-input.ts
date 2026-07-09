import type { Rvba } from "@/lib/broadcast/rvba";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";
import type { RendererCard } from "@/lib/universal-renderer/card-types";

import type { BroadcastAssetInput } from "./types";

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
    rvtr: pkg.rvtr,
    title: pkg.title.trim(),
    artist: pkg.artist.trim(),
    album: albumFromCards(pkg.cards),
    year: pkg.year,
    coverUrl: coverFromCards(pkg.cards),
  };
}

/** Fallback input from playhead RVBA when package metadata is still loading. */
export function extractBroadcastInputFromRvba(rvba: Rvba, songKey: string): BroadcastAssetInput {
  const title = rvba.title.trim() || rvba.link?.label?.trim() || "Now Playing";
  const artist = rvba.subtitle.trim();
  return {
    rvtr: songKey.trim().toUpperCase(),
    title,
    artist,
    album: null,
    year: null,
    coverUrl: null,
  };
}
