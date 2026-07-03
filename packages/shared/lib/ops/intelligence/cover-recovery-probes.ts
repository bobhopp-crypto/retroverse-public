const UA = "RetroverseCoverRecovery/1.0 (ops@retroverse.local)";
const CAA_BASE = "https://coverartarchive.org/release";
const ITUNES_SEARCH = "https://itunes.apple.com/search";
const MB_BASE = "https://musicbrainz.org/ws/2";
const DISCOGS_SEARCH = "https://api.discogs.com/database/search";

export type ExternalCoverCandidate = {
  coverUrl: string;
  coverSource: string;
  confidence: number;
  resolution: string | null;
  note: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeAlbumKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[''`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function itunesArtworkUrl(url100: string, size = 600): string {
  return url100.replace(/100x100bb/, `${size}x${size}bb`);
}

export async function probeItunesCover(
  artist: string,
  album: string,
  releaseYear: number | null,
): Promise<ExternalCoverCandidate | null> {
  const term = encodeURIComponent(`${artist} ${album || artist}`);
  try {
    const res = await fetch(`${ITUNES_SEARCH}?term=${term}&entity=album&limit=5`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        collectionName: string;
        artistName: string;
        releaseDate: string;
        artworkUrl100: string;
      }>;
    };
    const results = data.results ?? [];
    const albumKey = normalizeAlbumKey(album || "");
    const exact = album
      ? results.find((r) => normalizeAlbumKey(r.collectionName) === albumKey)
      : results[0];
    const top = exact ?? results[0];
    if (!top?.artworkUrl100) return null;

    const yearFromDate = top.releaseDate ? Number(top.releaseDate.slice(0, 4)) : null;
    const yearMatch =
      releaseYear != null && yearFromDate != null ? Math.abs(releaseYear - yearFromDate) <= 1 : false;
    const artistMatch = normalizeAlbumKey(top.artistName).includes(
      normalizeAlbumKey(artist).split(" ")[0] ?? "",
    );

    let confidence = 55;
    if (exact && yearMatch && artistMatch) confidence = 92;
    else if (exact && artistMatch) confidence = 78;
    else if (exact) confidence = 68;
    else if (results.length > 0) confidence = 55;

    return {
      coverUrl: itunesArtworkUrl(top.artworkUrl100),
      coverSource: "iTunes Artwork",
      confidence,
      resolution: "600x600",
      note: exact
        ? yearMatch
          ? "iTunes exact album + year"
          : "iTunes album title match"
        : "iTunes fuzzy match",
    };
  } catch {
    return null;
  }
}

export async function probeMusicBrainzCover(
  artist: string,
  album: string,
  releaseYear: number | null,
): Promise<ExternalCoverCandidate | null> {
  try {
    const q = encodeURIComponent(`artist:"${artist}" AND release:"${album}"`);
    const searchRes = await fetch(`${MB_BASE}/release?query=${q}&fmt=json&limit=5`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!searchRes.ok) return null;
    const search = (await searchRes.json()) as {
      releases?: Array<{ id: string; title: string; date?: string }>;
    };
    const releases = search.releases ?? [];
    if (releases.length === 0) return null;

    const albumKey = normalizeAlbumKey(album);
    let pick =
      releases.find((r) => normalizeAlbumKey(r.title) === albumKey) ?? releases[0]!;
    if (releaseYear != null) {
      const yearMatch = releases.find((r) => {
        const y = r.date ? Number(r.date.slice(0, 4)) : null;
        return normalizeAlbumKey(r.title) === albumKey && y != null && Math.abs(y - releaseYear) <= 1;
      });
      if (yearMatch) pick = yearMatch;
    }

    await sleep(1100);
    const caaRes = await fetch(`${CAA_BASE}/${pick.id}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!caaRes.ok) return null;
    const caa = (await caaRes.json()) as {
      images?: Array<{ front?: boolean; image?: string; thumbnails?: { large?: string } }>;
    };
    const images = caa.images ?? [];
    const front = images.find((i) => i.front) ?? images[0];
    const coverUrl = front?.image ?? front?.thumbnails?.large ?? null;
    if (!coverUrl) return null;

    const yearFromMb = pick.date ? Number(pick.date.slice(0, 4)) : null;
    const yearMatch =
      releaseYear != null && yearFromMb != null ? Math.abs(releaseYear - yearFromMb) <= 1 : false;
    const titleMatch = normalizeAlbumKey(pick.title) === albumKey;

    let confidence = 72;
    if (titleMatch && yearMatch) confidence = 90;
    else if (titleMatch) confidence = 82;

    return {
      coverUrl,
      coverSource: "MusicBrainz CAA",
      confidence,
      resolution: "full",
      note: `MB release ${pick.id}`,
    };
  } catch {
    return null;
  }
}

export async function probeDiscogsCover(
  artist: string,
  album: string,
  releaseYear: number | null,
): Promise<ExternalCoverCandidate | null> {
  try {
    const q = encodeURIComponent(`${artist} ${album}`);
    const headers: Record<string, string> = { "User-Agent": UA, Accept: "application/json" };
    const token = process.env.DISCOGS_TOKEN?.trim();
    if (token) headers.Authorization = `Discogs token=${token}`;

    const res = await fetch(`${DISCOGS_SEARCH}?type=release&q=${q}&per_page=5`, {
      headers,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        title: string;
        year?: string;
        thumb?: string;
        cover_image?: string;
      }>;
    };
    const results = data.results ?? [];
    if (results.length === 0) return null;

    const albumKey = normalizeAlbumKey(album);
    let pick = results.find((r) => normalizeAlbumKey(r.title).includes(albumKey)) ?? results[0]!;
    if (releaseYear != null) {
      const yearHit = results.find((r) => {
        const y = r.year ? Number(r.year) : null;
        return y != null && Math.abs(y - releaseYear) <= 1;
      });
      if (yearHit) pick = yearHit;
    }

    const coverUrl = pick.cover_image || pick.thumb;
    if (!coverUrl) return null;

    const yearFromDiscogs = pick.year ? Number(pick.year) : null;
    const yearMatch =
      releaseYear != null && yearFromDiscogs != null
        ? Math.abs(releaseYear - yearFromDiscogs) <= 1
        : false;

    return {
      coverUrl,
      coverSource: "Discogs Release",
      confidence: yearMatch ? 76 : 65,
      resolution: "thumb",
      note: pick.title,
    };
  } catch {
    return null;
  }
}

export async function probeItunesTrackCover(
  artist: string,
  title: string,
): Promise<ExternalCoverCandidate | null> {
  const term = encodeURIComponent(`${artist} ${title}`);
  try {
    const res = await fetch(`${ITUNES_SEARCH}?term=${term}&entity=song&limit=5`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: Array<{
        trackName: string;
        artistName: string;
        artworkUrl100: string;
      }>;
    };
    const results = data.results ?? [];
    const titleKey = normalizeAlbumKey(title);
    const pick =
      results.find((r) => normalizeAlbumKey(r.trackName) === titleKey) ?? results[0];
    if (!pick?.artworkUrl100) return null;
    return {
      coverUrl: itunesArtworkUrl(pick.artworkUrl100),
      coverSource: "iTunes Track Artwork",
      confidence: 76,
      resolution: "600x600",
      note: `iTunes song: ${pick.trackName}`,
    };
  } catch {
    return null;
  }
}

export async function probeExternalCovers(
  artist: string,
  album: string,
  releaseYear: number | null,
  title?: string,
): Promise<ExternalCoverCandidate | null> {
  const itunes = await probeItunesCover(artist, album || title || artist, releaseYear);
  if (itunes && itunes.confidence >= 76) return itunes;

  await sleep(400);
  const mb = await probeMusicBrainzCover(artist, album || title || "", releaseYear);
  if (mb && mb.confidence >= 78) return mb;

  await sleep(400);
  const discogs = await probeDiscogsCover(artist, album || title || "", releaseYear);
  if (discogs && discogs.confidence >= 76) return discogs;

  if (title) {
    await sleep(300);
    const track = await probeItunesTrackCover(artist, title);
    if (track) return track;
  }

  const candidates = [itunes, mb, discogs].filter(Boolean) as ExternalCoverCandidate[];
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.confidence - a.confidence)[0]!;
}
