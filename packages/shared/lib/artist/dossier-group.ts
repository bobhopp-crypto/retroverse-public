import { featuredLabelArtists, normalizeLabelArtist, primaryLabelArtist, starterArtistHref } from "@/lib/artist/label-artist";

export type DossierSongCard = {
  key: string;
  title: string;
  year: number | null;
  /** File lives in DJ MEDIA/VIDEO. */
  inCollection: boolean;
  /** Safe to treat as a VirtualDJ-facing identity. UNL and do-not-write are not. */
  vdjIdentity: boolean;
  trackHref: string;
};

export type DossierArtistShelf = {
  displayName: string;
  songs: DossierSongCard[];
  collectionCount: number;
  related: { name: string; href: string }[];
};

const VIDEO_LIBRARY = /dj media\/video/i;
const FEATURED_SONG_LIMIT = 12;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return value.split(/[,;/]/).map((part) => part.trim()).filter(Boolean);
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return item.trim() ? [item.trim()] : [];
    const record = asRecord(item);
    const name = record ? asString(record.name) ?? asString(record.labelArtist) ?? asString(record.artist) : null;
    return name ? [name] : [];
  });
}

function pathList(record: Record<string, unknown>): string[] {
  const direct = [
    ...stringList(record.paths),
    ...stringList(record.files),
    ...stringList(record.assets),
  ];
  for (const key of ["path", "mediaPath", "file", "filePath"]) {
    const one = asString(record[key]);
    if (one) direct.push(one);
  }
  return direct;
}

function readYear(record: Record<string, unknown>, identity: Record<string, unknown> | null): number | null {
  for (const value of [identity?.year, identity?.releaseYear, record.year, record.releaseYear]) {
    const year = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isInteger(year) && year >= 1900 && year <= 2035) return year;
  }
  return null;
}

function readFlag(record: Record<string, unknown>, identity: Record<string, unknown> | null): boolean {
  const flags = asRecord(record.flags);
  for (const value of [record.doNotWriteToVdj, identity?.doNotWriteToVdj, flags?.doNotWriteToVdj]) {
    if (value === true) return true;
  }
  return false;
}

function hasConflict(record: Record<string, unknown>): boolean {
  if (record.packageLie === true || record.conflict === true || record.conflicts === true) return true;
  if (Array.isArray(record.conflicts) && record.conflicts.length > 0) return true;
  const pathCount = typeof record.pathCount === "number" ? record.pathCount : 0;
  return pathCount > 1;
}

function isUnlabeledId(id: string): boolean {
  return /^UNL[-_]/i.test(id);
}

export function isVideoLibraryPath(path: string): boolean {
  return VIDEO_LIBRARY.test(path.replace(/\\/g, "/"));
}

/** Featured rows stay capped. Library songs past that cap stay on the shelf. */
export function dossierShelfSongs(songs: DossierSongCard[]): DossierSongCard[] {
  const featured = songs.slice(0, FEATURED_SONG_LIMIT);
  const featuredKeys = new Set(featured.map((song) => song.key));
  const libraryOutsideFeatured = songs.filter(
    (song) => song.inCollection && !featuredKeys.has(song.key),
  );
  return [...featured, ...libraryOutsideFeatured];
}

export function groupDossiersForArtist(rows: unknown[], artistName: string): DossierArtistShelf {
  const wanted = normalizeLabelArtist(primaryLabelArtist(artistName));
  const songs: DossierSongCard[] = [];
  const seenTitles = new Set<string>();
  const related = new Map<string, { name: string; href: string }>();

  for (const raw of rows) {
    const record = asRecord(raw);
    if (!record) continue;
    const identity = asRecord(record.identity);
    const labelArtist =
      asString(identity?.labelArtist) ?? asString(record.labelArtist) ?? asString(record.artist) ?? "";
    const primary = primaryLabelArtist(labelArtist);
    if (!primary || normalizeLabelArtist(primary) !== wanted) continue;

    const title =
      asString(identity?.labelTitle) ?? asString(record.labelTitle) ?? asString(record.title) ?? "";
    if (!title) continue;

    const id = asString(record.id) ?? asString(record.ID) ?? "";
    const paths = pathList(record);
    const inCollection = paths.some(isVideoLibraryPath);
    const conflicted = hasConflict(record);
    const doNotWrite = readFlag(record, identity);
    const vdjIdentity = inCollection && !doNotWrite && !isUnlabeledId(id);
    const year = readYear(record, identity);
    const publicRvtr = asString(record.rvtr);
    const trackHref =
      vdjIdentity && publicRvtr && /^RVTR\d{6}$/i.test(publicRvtr)
        ? `/retroverse-2/song/${publicRvtr.toUpperCase()}`
        : "";

    const titleKey = normalizeLabelArtist(title);
    if (!conflicted && seenTitles.has(titleKey)) continue;
    if (!conflicted) seenTitles.add(titleKey);

    songs.push({
      key: id || `${titleKey}-${songs.length}`,
      title,
      year,
      inCollection,
      vdjIdentity,
      trackHref,
    });

    for (const name of featuredLabelArtists(labelArtist, stringList(identity?.features ?? record.features))) {
      const href = starterArtistHref(name);
      const key = normalizeLabelArtist(name);
      if (!href || related.has(key) || key === wanted) continue;
      related.set(key, { name: primaryLabelArtist(name), href });
    }
  }

  return {
    displayName: artistName,
    songs: dossierShelfSongs(songs),
    collectionCount: songs.filter((song) => song.inCollection).length,
    related: [...related.values()].slice(0, 4),
  };
}
