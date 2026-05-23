import type { HomeSearchPayload } from "./home-search-types";
import {
  artistKeysMatch,
  logSearchDedupe,
  logSearchOrder,
  normalizeArtistMatchKey,
  type SearchDedupeLog,
  type SearchOrderLog,
} from "./canonicalize-search";
import {
  dedupeHomeSearchAlbums,
  dedupeHomeSearchArtists,
  dedupeHomeSearchCharts,
  dedupeHomeSearchTracks,
} from "./dedupe-panels";
import {
  formatDisplayArtist,
  parseYearFromText,
  parsePeakPosition,
  textMatchScore,
} from "./display-format";

function primaryArtistName(payload: HomeSearchPayload): string | null {
  const qKey = normalizeArtistMatchKey(payload.q);
  if (qKey) {
    for (const row of payload.artists) {
      if (artistKeysMatch(row.name, qKey)) return row.name;
    }
  }
  let best: { name: string; score: number } | null = null;
  for (const row of payload.artists) {
    const score = textMatchScore(row.name, payload.q);
    if (score > 2) continue;
    if (!best || score < best.score) best = { name: row.name, score };
  }
  return best?.name ?? null;
}

function trackFirstAppearanceYear(
  row: HomeSearchPayload["tracks"][number],
): number {
  if (typeof row.year === "number" && row.year > 0) return row.year;
  return parseYearFromText(row.subtitle) ?? 9999;
}

function sortTracksByFirstAppearance(
  rows: HomeSearchPayload["tracks"],
): HomeSearchPayload["tracks"] {
  return [...rows].sort((a, b) => {
    const yearA = trackFirstAppearanceYear(a);
    const yearB = trackFirstAppearanceYear(b);
    if (yearA !== yearB) return yearA - yearB;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function sortAlbumsByFirstAppearance(
  rows: HomeSearchPayload["albums"],
): HomeSearchPayload["albums"] {
  return [...rows].sort((a, b) => {
    const yearA = a.year != null && a.year > 0 ? a.year : 9999;
    const yearB = b.year != null && b.year > 0 ? b.year : 9999;
    if (yearA !== yearB) return yearA - yearB;
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  });
}

function sortTracksByRelevance(
  rows: HomeSearchPayload["tracks"],
  q: string,
): HomeSearchPayload["tracks"] {
  return [...rows].sort((a, b) => {
    const peakA = parsePeakPosition(a.subtitle) ?? 999;
    const peakB = parsePeakPosition(b.subtitle) ?? 999;
    if (peakA !== peakB) return peakA - peakB;
    const artistA = textMatchScore(a.artist, q);
    const artistB = textMatchScore(b.artist, q);
    if (artistA !== artistB) return artistA - artistB;
    return textMatchScore(a.title, q) - textMatchScore(b.title, q);
  });
}

function sortAlbumsByRelevance(
  rows: HomeSearchPayload["albums"],
  q: string,
): HomeSearchPayload["albums"] {
  return [...rows].sort((a, b) => {
    const artistA = textMatchScore(a.artist, q);
    const artistB = textMatchScore(b.artist, q);
    if (artistA !== artistB) return artistA - artistB;
    const titleA = textMatchScore(a.title, q);
    const titleB = textMatchScore(b.title, q);
    if (titleA !== titleB) return titleA - titleB;
    const yearA = a.year ?? 0;
    const yearB = b.year ?? 0;
    return yearB - yearA;
  });
}

export function orderHomeSearchPayload(
  payload: HomeSearchPayload,
  canonicalArtist?: string | null,
): HomeSearchPayload {
  const q = payload.q;
  const entityKey = canonicalArtist
    ? normalizeArtistMatchKey(canonicalArtist)
    : normalizeArtistMatchKey(q);
  const primary =
    canonicalArtist ??
    payload.artists.find((row) => artistKeysMatch(row.name, entityKey))?.name ??
    primaryArtistName(payload);

  const dedupeLog: SearchDedupeLog = {
    artistsBefore: payload.artists.length,
    albumsBefore: payload.albums.length,
    songsBefore: payload.tracks.length,
    artistsAfter: 0,
    albumsAfter: 0,
    songsAfter: 0,
    canonicalArtist: canonicalArtist ?? null,
  };

  let artists = dedupeHomeSearchArtists(payload.artists, canonicalArtist);
  let albums = dedupeHomeSearchAlbums(payload.albums);
  let tracks = dedupeHomeSearchTracks(payload.tracks);
  dedupeLog.artistsAfter = artists.length;
  dedupeLog.albumsAfter = albums.length;
  dedupeLog.songsAfter = tracks.length;
  logSearchDedupe(dedupeLog);

  const entityChosen = Boolean(primary);

  if (primary) {
    const primaryDisplay = formatDisplayArtist(primary);
    albums = albums.filter(
      (a) =>
        artistKeysMatch(a.artist, primaryDisplay) ||
        textMatchScore(a.artist, primaryDisplay) <= 2,
    );
    tracks = tracks.filter(
      (t) =>
        artistKeysMatch(t.artist, primaryDisplay) ||
        textMatchScore(t.artist, primaryDisplay) <= 2,
    );
  }

  const orderLog: SearchOrderLog = {
    mode: entityChosen ? "chronology" : "relevance",
    canonicalArtist: canonicalArtist ?? primary ?? null,
    albumCount: albums.length,
    songCount: tracks.length,
  };

  if (entityChosen) {
    tracks = sortTracksByFirstAppearance(tracks);
    albums = sortAlbumsByFirstAppearance(albums);
  } else {
    tracks = sortTracksByRelevance(tracks, q);
    albums = sortAlbumsByRelevance(albums, q);
  }
  logSearchOrder(orderLog);

  artists = [...artists].sort(
    (a, b) => textMatchScore(a.name, q) - textMatchScore(b.name, q),
  );
  const charts = dedupeHomeSearchCharts(payload.charts);

  return { ...payload, tracks, albums, artists, charts };
}
