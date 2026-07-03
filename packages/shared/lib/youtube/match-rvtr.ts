import { artistMatchKeys, normalizeArtistMatchKey } from "@/lib/search/canonicalize-search";

export type RvtrMatchConfidence = "exact" | "high" | "medium" | "low" | "none";

export type RvtrMatchResult = {
  confidence: RvtrMatchConfidence;
  rvtr: string | null;
  trackId: number | null;
  retroverseTitle: string | null;
  retroverseArtist: string | null;
  confidenceScore: number | null;
};

export function normTitle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

type TrackRow = {
  track_id: string;
  retroverse_track_id: string | null;
  graph_track_id: number | null;
  canonical_title: string;
  canonical_artist_name: string;
};

export function buildRvtrMatchIndexes(tracks: TrackRow[]): {
  exactIndex: Map<string, TrackRow>;
  artistIndex: Map<string, TrackRow[]>;
} {
  const exactIndex = new Map<string, TrackRow>();
  const artistIndex = new Map<string, TrackRow[]>();

  for (const row of tracks) {
    const key = `${normalizeArtistMatchKey(row.canonical_artist_name)}::${normTitle(row.canonical_title)}`;
    if (!exactIndex.has(key)) exactIndex.set(key, row);

    for (const aKey of artistMatchKeys(row.canonical_artist_name)) {
      const norm = normalizeArtistMatchKey(aKey);
      if (!norm) continue;
      if (!artistIndex.has(norm)) artistIndex.set(norm, []);
      const bucket = artistIndex.get(norm)!;
      if (!bucket.some((t) => t.track_id === row.track_id)) bucket.push(row);
    }
  }

  return { exactIndex, artistIndex };
}

export function matchArtistTitleToRvtr(
  artistText: string,
  titleText: string,
  exactIndex: Map<string, TrackRow>,
  artistIndex: Map<string, TrackRow[]>,
): RvtrMatchResult {
  const aKey = normalizeArtistMatchKey(artistText);
  const tKey = normTitle(titleText);
  const combo = `${aKey}::${tKey}`;

  const exact = exactIndex.get(combo);
  if (exact) {
    return {
      confidence: "exact",
      rvtr: exact.track_id.trim().toUpperCase(),
      trackId: exact.graph_track_id,
      retroverseTitle: exact.canonical_title,
      retroverseArtist: exact.canonical_artist_name,
      confidenceScore: 0.99,
    };
  }

  const artistRows = artistIndex.get(aKey) ?? [];
  const fuzzy = artistRows.filter((t) => {
    const ct = normTitle(t.canonical_title);
    return ct === tKey || ct.includes(tKey) || tKey.includes(ct);
  });

  if (fuzzy.length === 1) {
    const row = fuzzy[0];
    return {
      confidence: "high",
      rvtr: row.track_id.trim().toUpperCase(),
      trackId: row.graph_track_id,
      retroverseTitle: row.canonical_title,
      retroverseArtist: row.canonical_artist_name,
      confidenceScore: 0.85,
    };
  }

  if (fuzzy.length > 1) {
    return {
      confidence: "medium",
      rvtr: null,
      trackId: null,
      retroverseTitle: null,
      retroverseArtist: null,
      confidenceScore: 0.5,
    };
  }

  if (artistRows.length > 0) {
    return {
      confidence: "low",
      rvtr: null,
      trackId: null,
      retroverseTitle: null,
      retroverseArtist: null,
      confidenceScore: 0.3,
    };
  }

  return {
    confidence: "none",
    rvtr: null,
    trackId: null,
    retroverseTitle: null,
    retroverseArtist: null,
    confidenceScore: null,
  };
}

export function youtubeThumbnailUrl(youtubeId: string): string {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

export function youtubeWatchUrl(youtubeId: string): string {
  return `https://www.youtube.com/watch?v=${youtubeId}`;
}

export function parseUploadDate(value: string | null | undefined): string | null {
  if (!value || value.length !== 8) return null;
  const y = value.slice(0, 4);
  const m = value.slice(4, 6);
  const d = value.slice(6, 8);
  return `${y}-${m}-${d}T00:00:00Z`;
}
