import { artistPagePath } from "@/lib/artist/resolve-artist";
import { albumSuggestionHref, trackSuggestionHref } from "@/lib/search/entity-routes";
import type { HomeSearchPayload } from "./home-search-types";
import { artistKeysMatch, formatCanonicalSearchHeader } from "./canonicalize-search";
import { dedupeByPanelId, dedupeSearchPanels, panelEntityId } from "./dedupe-panels";
import { orderHomeSearchPayload } from "./order-panels";
import {
  formatChartMeta,
  formatDisplayArtist,
  formatDisplayTitle,
  parseYearFromText,
  textMatchScore,
} from "./display-format";
import type { SearchPanels } from "./types";

const ACCENT_POOL = [
  "#0d6e7a",
  "#e85d1a",
  "#7b3fa8",
  "#2a5f9e",
  "#1f7a4a",
  "#b83d2a",
  "#c9a020",
  "#ffb5a7",
];

function accentFromKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i)) | 0;
  }
  return ACCENT_POOL[Math.abs(hash) % ACCENT_POOL.length]!;
}

function yearFromLinkedAlbum(
  linkedAlbum: string | null | undefined,
  albums: HomeSearchPayload["albums"],
): number | undefined {
  if (!linkedAlbum?.trim()) return undefined;
  const needle = linkedAlbum.trim().toLowerCase();
  for (const album of albums) {
    const title = album.title.trim().toLowerCase();
    if (!title) continue;
    if (title === needle || title.includes(needle) || needle.includes(title)) {
      const y = album.year;
      if (y != null && y > 0) return y;
    }
  }
  return undefined;
}

function resolveTrackYear(
  row: HomeSearchPayload["tracks"][number],
  albums: HomeSearchPayload["albums"],
  q: string,
): number {
  if (typeof row.year === "number" && row.year > 0) return row.year;
  const linked = yearFromLinkedAlbum(row.linkedAlbum, albums);
  if (linked) return linked;
  const fromSub =
    parseYearFromText(row.subtitle) ??
    parseYearFromText(row.href) ??
    parseYearFromText(q);
  return fromSub ?? 0;
}

export function normalizeHomeSearchPayload(raw: unknown, q: string): HomeSearchPayload {
  const empty: HomeSearchPayload = {
    ok: true,
    q,
    tracks: [],
    albums: [],
    artists: [],
    charts: [],
  };
  if (!raw || typeof raw !== "object") return empty;

  const body = raw as Record<string, unknown>;
  return {
    ok: true,
    q: typeof body.q === "string" ? body.q : q,
    tracks: Array.isArray(body.tracks)
      ? (body.tracks.filter((r) => r && typeof r === "object") as HomeSearchPayload["tracks"])
      : [],
    albums: Array.isArray(body.albums)
      ? (body.albums.filter((r) => r && typeof r === "object") as HomeSearchPayload["albums"])
      : [],
    artists: Array.isArray(body.artists)
      ? (body.artists.filter((r) => r && typeof r === "object") as HomeSearchPayload["artists"])
      : [],
    charts: Array.isArray(body.charts)
      ? (body.charts.filter((r) => r && typeof r === "object") as HomeSearchPayload["charts"])
      : [],
    incomplete: body.incomplete === true ? true : undefined,
  };
}

export function mapHomeSearchToPanels(
  raw: HomeSearchPayload,
  canonicalArtist?: string | null,
): SearchPanels {
  const payload = orderHomeSearchPayload(raw, canonicalArtist);
  const q = payload.q;
  const canonicalDisplay = canonicalArtist
    ? formatDisplayArtist(canonicalArtist)
    : null;

  const panelArtist = (name: string): string => {
    if (canonicalDisplay && artistKeysMatch(name, canonicalDisplay)) {
      return canonicalDisplay;
    }
    return formatDisplayArtist(name);
  };

  const albums = payload.albums.map((row, index) => {
      const id = panelEntityId("album", index, row.href, row.title);
      const title = formatDisplayTitle(row.title);
      const artist = panelArtist(row.artist);
      const chartNote =
        row.subtitle?.trim() ||
        (row.relation === "VDJ" ? "In library" : undefined);
      return {
        id,
        title,
        artist,
        year: row.year ?? 0,
        chartNote,
        hasVdj: row.relation === "VDJ",
        coverAccent: accentFromKey(id),
        coverUrl: row.coverUrl ?? undefined,
        href: albumSuggestionHref(title, row.href),
      };
    });

  const songs = payload.tracks.map((row, index) => {
      const id = panelEntityId("track", index, row.href, row.title);
      const title = formatDisplayTitle(row.title);
      const artist = panelArtist(row.artist);
      const chartMeta = formatChartMeta(row.subtitle);
      const linkedAlbum = row.linkedAlbum?.trim();
      const libraryNote = row.relation === "VDJ" || row.hasVideo ? "In library" : "";
      const year = resolveTrackYear(row, payload.albums, payload.q);
      const line3Parts = [chartMeta, linkedAlbum, libraryNote].filter(Boolean);
      return {
        id,
        title,
        artist,
        albumTitle: linkedAlbum ?? chartMeta ?? libraryNote,
        year,
        chartNote: line3Parts.length ? line3Parts.join(" · ") : undefined,
        hasVdj: row.relation === "VDJ" || row.hasVideo === true,
        coverAccent: accentFromKey(id),
        coverUrl: row.coverUrl ?? undefined,
        href: trackSuggestionHref(title, row.href),
      };
    });

  const artistsCharts = [
      ...payload.artists.map((row, index) => {
        const id = panelEntityId("artist", index, row.href, row.name);
        const title =
          canonicalDisplay && artistKeysMatch(row.name, canonicalDisplay)
            ? canonicalDisplay
            : formatDisplayArtist(row.name);
        const match = textMatchScore(row.name, q);
        const albumCount = payload.albums.filter(
          (a) =>
            artistKeysMatch(a.artist, row.name) ||
            textMatchScore(a.artist, row.name) <= 2,
        ).length;
        const trackCount = payload.tracks.filter(
          (t) =>
            artistKeysMatch(t.artist, row.name) ||
            textMatchScore(t.artist, row.name) <= 2,
        ).length;
        const depth =
          albumCount > 0 || trackCount > 0
            ? `${albumCount} albums · ${trackCount} songs`
            : undefined;
        return {
          id,
          title,
          subtitle: depth ?? (match <= 1 ? row.name : "Related match"),
          year: 0,
          kind: "artist" as const,
          coverAccent: accentFromKey(id),
          coverUrl: row.coverUrl ?? undefined,
          artistHref: artistPagePath(canonicalArtist ?? row.name),
        };
      }),
      ...payload.charts.map((row, index) => {
        const id = panelEntityId("chart", index, row.href, row.label);
        return {
          id,
          title: row.label.replace(/^Hot 100 · /i, "").trim() || row.label,
          subtitle: "Chart week",
          year: row.year,
          kind: "chart" as const,
          chartNote: row.weekDate,
          coverAccent: accentFromKey(id),
        };
      }),
    ];

  const deduped = dedupeSearchPanels(
    {
      albums: dedupeByPanelId(albums),
      songs: dedupeByPanelId(songs),
      artistsCharts: dedupeByPanelId(artistsCharts),
    },
    canonicalArtist,
  );

  return deduped;
}

export function canonicalSearchQueryDisplay(
  canonicalArtist: string | null | undefined,
  rawQuery: string,
): string {
  if (canonicalArtist?.trim()) {
    return formatCanonicalSearchHeader(canonicalArtist);
  }
  return rawQuery.trim() ? rawQuery.trim().toUpperCase() : "EXPLORE";
}
