/** Display-safe projection of a completed Artist Curator profile. */
export type ArtistProfileView = {
  schemaVersion: 1;
  rvar: string;
  name: string;
  aliases: string[];
  updatedAt: string;
  summary: string | null;
  story: string[];
  portraitUrl: string | null;
  songs: { rvtr: string; title: string; note: string | null }[];
  albums: { rval: string; title: string; year: number | null; note: string | null }[];
  videos: { videoKey: string; title: string; kind: string | null; note: string | null }[];
  chronology: { year: number; text: string }[];
  chartNotes: string[];
  connections: string[];
  discoveries: string[];
};

export type ArtistDirectoryEntry = Pick<ArtistProfileView, "rvar" | "name" | "aliases">;
const RVAR = /^RVAR\d{6}$/;
const RVTR = /^RVTR\d{6}$/;
const RVAL = /^RVAL\d{6}$/;
const VIDEO_KEY = /^[a-f0-9]{24}$/;
const INTERNAL = /\/Users\/|\/workspace\/|(?:^|\W)(?:packageLie|densityCaveat|storyIdentityMismatch|ingestionStatus|filePath|evidenceRefs|collisionQueue)(?:\W|$)/i;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text && text.length <= max && !INTERNAL.test(text) ? text : null;
}

function textList(value: unknown, count: number, length: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, count).map((item) => cleanText(item, length)).filter((item): item is string => Boolean(item));
}

export function projectArtistProfile(raw: unknown): ArtistProfileView | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.schemaVersion !== 1 || value.status !== "complete") return null;
  const rvar = cleanText(value.rvar, 10)?.toUpperCase();
  const name = cleanText(value.name, 160);
  const updatedAt = cleanText(value.updatedAt, 40);
  if (!rvar || !RVAR.test(rvar) || !name || !updatedAt || Number.isNaN(Date.parse(updatedAt))) return null;
  const portrait = cleanText(value.portraitUrl, 500);
  const portraitUrl = portrait && /^https:\/\//i.test(portrait) ? portrait : null;
  const songs = Array.isArray(value.songs) ? value.songs.slice(0, 24).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const rvtr = cleanText(row.rvtr, 10)?.toUpperCase();
    const title = cleanText(row.title, 180);
    return rvtr && RVTR.test(rvtr) && title ? [{ rvtr, title, note: cleanText(row.note, 300) }] : [];
  }) : [];
  const albums = Array.isArray(value.albums) ? value.albums.slice(0, 24).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const rval = cleanText(row.rval, 10)?.toUpperCase();
    const title = cleanText(row.title, 180);
    const year = Number(row.year);
    return rval && RVAL.test(rval) && title ? [{ rval, title, year: Number.isInteger(year) && year >= 1900 && year <= 2100 ? year : null, note: cleanText(row.note, 300) }] : [];
  }) : [];
  const videos = Array.isArray(value.videos) ? value.videos.slice(0, 30).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const videoKey = cleanText(row.videoKey, 24);
    const title = cleanText(row.title, 180);
    return videoKey && VIDEO_KEY.test(videoKey) && title ? [{ videoKey, title, kind: cleanText(row.kind, 70), note: cleanText(row.note, 300) }] : [];
  }) : [];
  const chronology = Array.isArray(value.chronology) ? value.chronology.slice(0, 20).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const year = Number(row.year);
    const text = cleanText(row.text, 400);
    return Number.isInteger(year) && year >= 1800 && year <= 2100 && text ? [{ year, text }] : [];
  }) : [];
  return {
    schemaVersion: 1, rvar, name,
    aliases: textList(value.aliases, 20, 160).filter((alias) => alias !== name),
    updatedAt, summary: cleanText(value.summary, 700),
    story: textList(value.story, 6, 1000), portraitUrl,
    songs, albums, videos, chronology,
    chartNotes: textList(value.chartNotes, 8, 400),
    connections: textList(value.connections, 12, 300),
    discoveries: textList(value.discoveries, 12, 400),
  };
}

export function validateArtistProfileView(raw: unknown): ArtistProfileView | null {
  if (!raw || typeof raw !== "object") return null;
  const view = raw as Record<string, unknown>;
  if (INTERNAL.test(JSON.stringify(view))) return null;
  if (Object.keys(view).some((key) => ![
    "schemaVersion", "rvar", "name", "aliases", "updatedAt", "summary", "story", "portraitUrl",
    "songs", "albums", "videos", "chronology", "chartNotes", "connections", "discoveries",
  ].includes(key))) return null;
  return projectArtistProfile({ ...view, status: "complete" });
}

export function artistCreditKey(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Sync rejects a longer explicit `remove` list. Directory replacement is not subject to this cap. */
export const ARTIST_PROFILE_REMOVAL_LIMIT = 200;

export type ArtistProfileSyncPlan = {
  directory: ArtistDirectoryEntry[];
  /** Deletes the stored directory will not cover, split so each request stays within the cap. */
  removalBatches: string[][];
  /** Already-published RVARs dropped by replacing the directory. Not repeated in `remove`. */
  retiredByDirectory: string[];
};

/**
 * Decide the next sync write.
 * A full directory replace retires every stored artist it leaves out, so those RVARs are not also sent as `remove`.
 * A profile uploaded this session (`sent`) whose file cannot be read yet is kept.
 */
export function planArtistProfileRetirement(input: {
  published: readonly ArtistDirectoryEntry[];
  sent: readonly string[];
  complete: readonly ArtistDirectoryEntry[];
  unreadable: readonly string[];
}): ArtistProfileSyncPlan {
  const unreadableIds = new Set(input.unreadable.map((rvar) => rvar.trim().toUpperCase()));
  const carried = input.published.filter((entry) =>
    unreadableIds.has(entry.rvar) && !input.complete.some((item) => item.rvar === entry.rvar));
  const directory = [...input.complete, ...carried];
  const keep = new Set([
    ...directory.map((entry) => entry.rvar),
    ...input.sent.map((rvar) => rvar.trim().toUpperCase()).filter((rvar) => unreadableIds.has(rvar)),
  ]);
  const remove = removedPublishedRvars(
    [...input.published.map((entry) => entry.rvar), ...input.sent],
    [...keep],
  );
  const publishedIds = new Set(input.published.map((entry) => entry.rvar));
  const retiredByDirectory = remove.filter((rvar) => publishedIds.has(rvar));
  const explicit = remove.filter((rvar) => !publishedIds.has(rvar));
  const removalBatches: string[][] = [];
  for (let offset = 0; offset < explicit.length; offset += ARTIST_PROFILE_REMOVAL_LIMIT) {
    removalBatches.push(explicit.slice(offset, offset + ARTIST_PROFILE_REMOVAL_LIMIT));
  }
  return { directory, removalBatches, retiredByDirectory };
}

/** RVARs that were public and are no longer in the completed set. */
export function removedPublishedRvars(published: readonly string[], complete: readonly string[]): string[] {
  const keep = new Set(complete.map((rvar) => rvar.trim().toUpperCase()));
  const removed: string[] = [];
  const seen = new Set<string>();
  for (const rvar of published) {
    const id = rvar.trim().toUpperCase();
    if (keep.has(id) || seen.has(id)) continue;
    seen.add(id);
    removed.push(id);
  }
  return removed;
}

export function resolveArtistCredit(credit: string, directory: ArtistDirectoryEntry[]): string | null {
  const key = artistCreditKey(credit);
  if (!key) return null;
  const matches = directory.filter((entry) => [entry.name, ...entry.aliases].some((name) => artistCreditKey(name) === key));
  return matches.length === 1 ? matches[0]!.rvar : null;
}
