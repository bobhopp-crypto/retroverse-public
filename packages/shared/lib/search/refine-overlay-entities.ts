import { displayArtistName } from "@/lib/artist/slug";
import {
  artistKeysMatch,
  normalizeArtistMatchKey,
  normalizeSearchQuery,
} from "@/lib/search/canonicalize-search";
import { normalizeSearchLabel } from "@/lib/search/normalize-search-label";
import type { SearchEntity } from "@/lib/search/search-entity-types";

function artistDisplayScore(label: string): number {
  const trimmed = label.trim();
  if (!trimmed) return 0;
  let score = 0;
  if (/^[A-Z]/.test(trimmed)) score += 4;
  if (/^[A-Z][a-z]/.test(trimmed)) score += 2;
  if (/^the\s/i.test(trimmed)) score += 3;
  if (trimmed === trimmed.toLowerCase()) score -= 6;
  if (/^[a-z]+$/.test(trimmed)) score -= 4;
  return score;
}

function pickPreferredArtist(a: SearchEntity, b: SearchEntity): SearchEntity {
  if (a.rank !== b.rank) return a.rank <= b.rank ? a : b;
  const scoreA = artistDisplayScore(a.label);
  const scoreB = artistDisplayScore(b.label);
  if (scoreA !== scoreB) return scoreA >= scoreB ? a : b;
  return a.label.length >= b.label.length ? a : b;
}

/** Collapse artist rows that share the same identity key (e.g. supremes / The Supremes). */
export function collapseArtistAliases(entities: SearchEntity[]): SearchEntity[] {
  const artists: SearchEntity[] = [];
  const rest: SearchEntity[] = [];

  for (const entity of entities) {
    if (entity.entityType === "artist") artists.push(entity);
    else rest.push(entity);
  }

  const byKey = new Map<string, SearchEntity>();
  for (const artist of artists) {
    const key = normalizeArtistMatchKey(artist.label);
    if (!key) continue;
    const existing = byKey.get(key);
    byKey.set(key, existing ? pickPreferredArtist(existing, artist) : artist);
  }

  const collapsed = [...byKey.values()].sort(
    (a, b) =>
      a.rank - b.rank ||
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );

  return [...collapsed, ...rest];
}

function canonicalArtistField(name: string | null | undefined): string | null {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  return displayArtistName(trimmed);
}

/** Normalize artist strings on albums/tracks for archival trust. */
export function applyCanonicalArtistDisplay(entities: SearchEntity[]): SearchEntity[] {
  return entities.map((entity) => {
    if (entity.entityType === "artist") {
      return { ...entity, label: displayArtistName(entity.label) };
    }
    if (entity.entityType === "track" || entity.entityType === "album") {
      return { ...entity, artist: canonicalArtistField(entity.artist) };
    }
    return entity;
  });
}

const OVERLAY_OTHERS_TRACK_CAP = 4;

function titleNorm(title: string): string {
  return normalizeSearchLabel(title);
}

function dedupeTracksByRvId(tracks: SearchEntity[]): SearchEntity[] {
  const seen = new Set<string>();
  const out: SearchEntity[] = [];
  for (const track of tracks) {
    const rv = track.rvId?.trim().toUpperCase();
    if (rv) {
      if (seen.has(rv)) continue;
      seen.add(rv);
    }
    out.push(track);
  }
  return out;
}

function trackTrustScore(entity: SearchEntity, query: string, anchorArtist: string | null): number {
  const q = normalizeSearchQuery(query);
  const title = titleNorm(entity.label);
  let score = entity.rank * 100;

  if (title === q) score -= 80;
  else if (title.startsWith(q)) score -= 50;
  else if (title.includes(` ${q}`) || title.includes(q)) score -= 20;

  if (anchorArtist && entity.artist && artistKeysMatch(entity.artist, anchorArtist)) {
    score -= 120;
  } else if (anchorArtist && entity.artist && !artistKeysMatch(entity.artist, anchorArtist)) {
    score += 40;
  }

  return score;
}

/**
 * When query resolves to a strong artist, prioritize that artist's tracks at the top
 * and drop weak cross-artist substring noise from the overlay tail.
 */
export function prioritizeOverlayTracks(
  entities: SearchEntity[],
  query: string,
): SearchEntity[] {
  const artists = entities.filter((e) => e.entityType === "artist");
  const allTracks = entities.filter((e) => e.entityType === "track");

  const hardAnchor =
    artists.find((a) => a.rank <= 15 && artistKeysMatch(a.label, query)) ??
    artists[0] ??
    null;
  const softAnchorName = hardAnchor?.label ?? null;
  const anchorName = softAnchorName;

  const nonTracks = entities.filter((e) => e.entityType !== "track");
  const tracks = dedupeTracksByRvId(
    allTracks
      .map((t) => ({ t, score: trackTrustScore(t, query, anchorName) }))
      .sort((a, b) => a.score - b.score || a.t.label.localeCompare(b.t.label))
      .map(({ t }) => t),
  );

  if (anchorName) {
    const anchored = tracks.filter((t) => t.artist && artistKeysMatch(t.artist, anchorName));
    const others = tracks
      .filter((t) => !t.artist || !artistKeysMatch(t.artist, anchorName))
      .slice(0, OVERLAY_OTHERS_TRACK_CAP);
    const displayAnchor = displayArtistName(anchorName);
    const normalizeArtist = (list: SearchEntity[]) =>
      list.map((t) =>
        t.artist && artistKeysMatch(t.artist, anchorName)
          ? { ...t, artist: displayAnchor }
          : t,
      );
    return [...nonTracks, ...normalizeArtist(anchored), ...normalizeArtist(others)];
  }

  return [...nonTracks, ...tracks];
}

export function refineOverlayEntities(
  entities: SearchEntity[],
  query: string,
): SearchEntity[] {
  let out = collapseArtistAliases(entities);
  out = applyCanonicalArtistDisplay(out);
  out = prioritizeOverlayTracks(out, query);
  return out;
}
