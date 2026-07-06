import { slugFromArtistName } from "@/lib/artist/slug";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { resolveChartOrbitTrack } from "@/lib/ops/chart-orbit/resolve-track";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { resolveHeroForRvtr } from "@/lib/visual-profile/resolve-hero-for-rvtr";

import { loadRvtrAliasStore, lookupAliasRvtrFromStore } from "./rvtr-aliases";
import type { LiveResolution } from "./types";

const RE_RVTR = /^RVTR\d{6}$/i;
const RE_VDJ = /^vdj:[0-9a-f]{16}$/i;

/** Canonical live track id — RVTR or `vdj:{16-hex-key}`. */
export function normalizeLiveTrackId(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (RE_RVTR.test(trimmed)) return trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();
  if (RE_VDJ.test(lower)) return lower;
  return null;
}

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

type PathRvtrRow = {
  source_path: string;
  rvtr: string;
};

async function loadRvtrByPath(filepath: string): Promise<string | null> {
  const pathKey = normPath(filepath);
  if (!pathKey) return null;

  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rows = await inspectQuery<PathRvtrRow>(
    `
    SELECT DISTINCT ON (ma.source_path)
      ma.source_path,
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id))) AS rvtr
    FROM media_assets ma
    JOIN media_track_links mtl ON mtl.media_asset_id = ma.id
    JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
    WHERE ma.source_path = $1
    ORDER BY ma.source_path, mtl.confidence_score DESC NULLS LAST, ma.id ASC
    LIMIT 1
    `,
    [pathKey],
  );

  const rvtr = rows[0]?.rvtr?.trim().toUpperCase();
  return rvtr && RE_RVTR.test(rvtr) ? rvtr : null;
}

export type LiveTrackResolution = {
  rvtr: string | null;
  resolution: LiveResolution;
  year: number | null;
  coverUrl: string | null;
};

export async function resolveLiveTrack(input: {
  filepath: string;
  artist: string;
  title: string;
}): Promise<LiveTrackResolution> {
  const artist = input.artist.trim();
  const title = input.title.trim();
  const filepath = normPath(input.filepath);

  let rvtr: string | null = null;
  let resolution: LiveResolution = "unresolved";

  const fromPath = await loadRvtrByPath(filepath);
  if (fromPath) {
    rvtr = fromPath;
    resolution = "filepath";
  } else {
    const aliasStore = await loadRvtrAliasStore();
    const fromAlias = lookupAliasRvtrFromStore(aliasStore, artist, title);
    if (fromAlias) {
      rvtr = fromAlias;
      resolution = "fallback";
    } else {
      const ping = await inspectPing();
      if (ping.ok) {
        const resolved = await resolveChartOrbitTrack(title, { artistHint: artist });
        if (resolved?.rvtr && RE_RVTR.test(resolved.rvtr)) {
          rvtr = resolved.rvtr.toUpperCase();
          resolution = "fallback";
        }
      }
    }
  }

  if (rvtr) {
    const [track, hero] = await Promise.all([
      loadTrackPage(rvtr),
      resolveHeroForRvtr(rvtr),
    ]);
    if (track) {
      return {
        rvtr,
        resolution,
        year: track.releaseYear,
        coverUrl: hero.url,
      };
    }
  }

  return {
    rvtr,
    resolution,
    year: null,
    coverUrl: null,
  };
}

export function normMediaPath(p: string): string {
  return normPath(p);
}

export function songKeyFromPath(filepath: string): string {
  return normPath(filepath);
}
