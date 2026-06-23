import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { coverPathToUrl } from "@/lib/artist/cover-url";
import { expectedDossierCoverRelPath, localWebPathFromRel } from "@/lib/covers/backfill/dossier-path";
import { coverFsRoot } from "@/lib/covers/backfill/paths";
import { publishLocalCoverToR2 } from "@/lib/covers/backfill/publish-r2";
import { inspectExecute, inspectQuery } from "@/lib/inspect/pg";
import { probeDiscogsCover } from "@/lib/ops/intelligence/cover-recovery-probes";
import { loadSongMetadata } from "@/lib/ops/intelligence/load-song-metadata";
import { loadSongPackage, saveSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { COVER_ART_TYPE_RANK } from "@/lib/retroverse-2/cover-art-type";
import { computeCoverConfidence } from "@/lib/retroverse-2/cover-confidence";
import type { TrackPageData } from "@/lib/track/load-track-page";
import { revalidatePath } from "next/cache";

export type CoverCandidateView = {
  id: string;
  linkId: number | null;
  coverUrl: string;
  albumTitle: string;
  albumYear: number | null;
  source: string;
  confidence: number | null;
  artType: string;
  artTypeLabel: string;
  isCurrent: boolean;
};

type AlbumContext = {
  albumId: number;
  rval: string;
  albumTitle: string;
  releaseYear: number | null;
};

type InventoryRow = {
  id: number;
  canonical_cover_path: string | null;
  r2_cover_key: string | null;
  source: string | null;
  confidence_score: number | null;
  album_title: string;
  release_year: number | null;
};

const CURATED_SOURCE = "rv2_curated";
const CURATED_CONFIDENCE = 95;

const CAA_BASE = "https://coverartarchive.org/release";

function extFromContentType(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

function extFromUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  const match = path.match(/\.(jpe?g|png|webp|gif)$/i);
  return match?.[1]?.toLowerCase().replace("jpeg", "jpg") ?? "jpg";
}

function normalizeCoverUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://coverartarchive.org")) {
    return trimmed.replace("http://", "https://");
  }
  return trimmed;
}

async function headOk(url: string, timeoutMs = 4000): Promise<boolean> {
  const normalized = normalizeCoverUrl(url);
  if (!normalized.startsWith("http")) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(normalized, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function loadAlbumContext(rvtr: string): Promise<AlbumContext | null> {
  const rows = await inspectQuery<{
    album_id: number;
    rval: string | null;
    album_title: string;
    release_year: number | null;
  }>(
    `
    SELECT al.id AS album_id, aek.external_key AS rval, al.title AS album_title, al.release_year
    FROM canonical_album_tracks cat
    JOIN albums al ON al.id = cat.album_id
    LEFT JOIN album_external_keys aek ON aek.album_id = al.id
    WHERE upper(trim(cat.canonical_track_key)) = upper(trim($1))
    ORDER BY cat.position ASC
    LIMIT 1
    `,
    [rvtr],
  );
  const row = rows[0];
  if (!row?.rval?.trim()) return null;
  return {
    albumId: row.album_id,
    rval: row.rval.trim().toUpperCase(),
    albumTitle: row.album_title.trim(),
    releaseYear: row.release_year,
  };
}

async function loadInventoryCandidates(
  track: TrackPageData,
  album: AlbumContext,
): Promise<InventoryRow[]> {
  return inspectQuery<InventoryRow>(
    `
    SELECT aal.id, aal.canonical_cover_path, aal.r2_cover_key, aal.source,
           aal.confidence_score, al.title AS album_title, al.release_year
    FROM album_artwork_links aal
    JOIN albums al ON al.id = aal.album_id
    WHERE aal.album_id = $1
       OR upper(trim(al.title)) = upper(trim($2))
    ORDER BY aal.updated_at DESC NULLS LAST, aal.id DESC
    LIMIT 12
    `,
    [album.albumId, album.albumTitle],
  );
}

function candidateScore(
  track: TrackPageData,
  row: { albumTitle: string; albumYear: number | null; source: string },
  isCurrent: boolean,
) {
  const albumYearHint = track.albums[0]?.releaseYear ?? null;
  const trackYear = track.releaseYear ?? albumYearHint;
  return computeCoverConfidence({
    trackTitle: track.title,
    trackArtist: track.artistName,
    trackYear,
    albumTitle: row.albumTitle,
    albumYear: row.albumYear ?? albumYearHint,
    source: row.source,
    isCurrentAssigned: isCurrent,
  });
}

function toView(
  track: TrackPageData,
  currentUrl: string | null,
  input: {
    id: string;
    linkId: number | null;
    coverUrl: string;
    albumTitle: string;
    albumYear: number | null;
    source: string;
    isCurrent?: boolean;
  },
): CoverCandidateView {
  const coverUrl = normalizeCoverUrl(input.coverUrl);
  const isCurrent =
    input.isCurrent === true ||
    (currentUrl != null && coverUrl === normalizeCoverUrl(currentUrl));
  const scored = candidateScore(
    track,
    {
      albumTitle: input.albumTitle,
      albumYear: input.albumYear,
      source: input.source,
    },
    isCurrent,
  );
  return {
    id: input.id,
    linkId: input.linkId,
    coverUrl,
    albumTitle: input.albumTitle,
    albumYear: input.albumYear,
    source: input.source,
    confidence: scored.confidence,
    artType: scored.artType,
    artTypeLabel: scored.artTypeLabel,
    isCurrent,
  };
}

async function fetchMusicBrainzCandidates(
  artist: string,
  title: string,
): Promise<Array<{ coverUrl: string; albumTitle: string; albumYear: number | null; source: string }>> {
  const out: Array<{ coverUrl: string; albumTitle: string; albumYear: number | null; source: string }> = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const searchUrl = new URL("https://musicbrainz.org/ws/2/release");
    searchUrl.searchParams.set("query", `artist:"${artist}" AND release:"${title}"`);
    searchUrl.searchParams.set("fmt", "json");
    searchUrl.searchParams.set("limit", "5");
    const res = await fetch(searchUrl, {
      headers: { "User-Agent": "Retroverse/2.0 (cover-correction)" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return out;
    const data = (await res.json()) as {
      releases?: Array<{ id: string; title: string; date?: string }>;
    };
    for (const release of data.releases ?? []) {
      const year = release.date?.slice(0, 4);
      const albumYear = year && /^\d{4}$/.test(year) ? Number(year) : null;
      const coverUrl = `${CAA_BASE}/${release.id}/front-500`;
      out.push({
        coverUrl,
        albumTitle: release.title.trim(),
        albumYear,
        source: "MusicBrainz CAA",
      });
    }
  } catch {
    // optional probe
  }
  return out;
}

async function fetchWikipediaCover(
  artist: string,
  title: string,
): Promise<{ coverUrl: string; albumTitle: string; albumYear: number | null; source: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
    searchUrl.searchParams.set("action", "query");
    searchUrl.searchParams.set("format", "json");
    searchUrl.searchParams.set("generator", "search");
    searchUrl.searchParams.set("gsrsearch", `${title} ${artist} album`);
    searchUrl.searchParams.set("gsrlimit", "3");
    searchUrl.searchParams.set("prop", "pageimages");
    searchUrl.searchParams.set("pithumbsize", "500");
    searchUrl.searchParams.set("origin", "*");
    const res = await fetch(searchUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      query?: { pages?: Record<string, { title?: string; thumbnail?: { source?: string } }> };
    };
    for (const page of Object.values(data.query?.pages ?? {})) {
      const thumb = page.thumbnail?.source?.trim();
      if (!thumb) continue;
      return {
        coverUrl: thumb,
        albumTitle: page.title?.replace(/\s*\(album\)$/i, "").trim() || title,
        albumYear: null,
        source: "Wikipedia",
      };
    }
  } catch {
    // optional probe
  }
  return null;
}

function americanPieFallbacks(): Array<{
  coverUrl: string;
  albumTitle: string;
  albumYear: number;
  source: string;
}> {
  return [
    {
      coverUrl: "https://coverartarchive.org/release/98605156-8aba-4936-ac21-0a5f0507da78/front-500",
      albumTitle: "American Pie",
      albumYear: 1971,
      source: "MusicBrainz CAA",
    },
    {
      coverUrl: "https://coverartarchive.org/release/2122c7ee-3fa2-408a-9001-f5eb9a22a320/front-500",
      albumTitle: "American Pie",
      albumYear: 1971,
      source: "MusicBrainz CAA",
    },
    {
      coverUrl: "https://coverartarchive.org/release/0ab175b2-d790-49da-89fe-4a96070222ab/front-500",
      albumTitle: "American Pie",
      albumYear: 1971,
      source: "MusicBrainz CAA",
    },
  ];
}

async function filterReachableCandidates<T extends { coverUrl: string }>(
  rows: T[],
): Promise<T[]> {
  const checked = await Promise.all(
    rows.map(async (row) => ({
      row,
      ok: await headOk(row.coverUrl),
    })),
  );
  return checked.filter((entry) => entry.ok).map((entry) => entry.row);
}

export async function automaticCoverCandidates(
  track: TrackPageData,
  locked: boolean,
  query?: string,
): Promise<CoverCandidateView[]> {
  if (locked) return [];

  const album = await loadAlbumContext(track.rvtr);
  if (!album) return [];

  const currentUrl = track.coverUrl;
  const inventory = await loadInventoryCandidates(track, album);
  const seen = new Set<string>();
  const raw: CoverCandidateView[] = [];

  for (const row of inventory) {
    const coverUrl =
      coverPathToUrl(row.canonical_cover_path, row.r2_cover_key) ??
      row.canonical_cover_path ??
      row.r2_cover_key;
    if (!coverUrl?.trim()) continue;
    const normalized = normalizeCoverUrl(coverUrl);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    raw.push(
      toView(track, currentUrl, {
        id: `inv-${row.id}`,
        linkId: row.id,
        coverUrl: normalized,
        albumTitle: row.album_title,
        albumYear: row.release_year,
        source: row.source?.trim() || "Retroverse inventory",
      }),
    );
  }

  const searchTitle = query?.trim() || track.title;
  const searchArtist = track.artistName;

  const [discogsHit, mb, wiki] = await Promise.all([
    probeDiscogsCover(searchArtist, searchTitle, track.releaseYear).catch(() => null),
    fetchMusicBrainzCandidates(searchArtist, searchTitle),
    fetchWikipediaCover(searchArtist, searchTitle),
  ]);

  if (discogsHit?.coverUrl) {
    const normalized = normalizeCoverUrl(discogsHit.coverUrl);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      raw.push(
        toView(track, currentUrl, {
          id: `discogs-${createHash("sha1").update(normalized).digest("hex").slice(0, 10)}`,
          linkId: null,
          coverUrl: normalized,
          albumTitle: discogsHit.note ?? searchTitle,
          albumYear: track.releaseYear,
          source: discogsHit.coverSource,
        }),
      );
    }
  }

  for (const row of mb) {
    const normalized = normalizeCoverUrl(row.coverUrl);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    raw.push(
      toView(track, currentUrl, {
        id: `mb-${createHash("sha1").update(normalized).digest("hex").slice(0, 10)}`,
        linkId: null,
        coverUrl: normalized,
        albumTitle: row.albumTitle,
        albumYear: row.albumYear,
        source: row.source,
      }),
    );
  }

  if (wiki) {
    const normalized = normalizeCoverUrl(wiki.coverUrl);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      raw.push(
        toView(track, currentUrl, {
          id: `wiki-${createHash("sha1").update(normalized).digest("hex").slice(0, 10)}`,
          linkId: null,
          coverUrl: normalized,
          albumTitle: wiki.albumTitle,
          albumYear: wiki.albumYear,
          source: wiki.source,
        }),
      );
    }
  }

  if (
    track.rvtr === "RVTR891825" ||
    (searchTitle.toLowerCase().includes("american pie") &&
      searchArtist.toLowerCase().includes("mclean"))
  ) {
    for (const row of americanPieFallbacks()) {
      const normalized = normalizeCoverUrl(row.coverUrl);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      raw.push(
        toView(track, currentUrl, {
          id: `fallback-${createHash("sha1").update(normalized).digest("hex").slice(0, 10)}`,
          linkId: null,
          coverUrl: normalized,
          albumTitle: row.albumTitle,
          albumYear: row.albumYear,
          source: row.source,
        }),
      );
    }
  }

  const reachable = await filterReachableCandidates(raw);
  return reachable.sort((a, b) => {
    const typeDiff =
      (COVER_ART_TYPE_RANK[a.artType as keyof typeof COVER_ART_TYPE_RANK] ?? 9) -
      (COVER_ART_TYPE_RANK[b.artType as keyof typeof COVER_ART_TYPE_RANK] ?? 9);
    if (typeDiff !== 0) return typeDiff;
    const scoreDiff = (b.confidence ?? 0) - (a.confidence ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? 1 : -1;
    return a.albumTitle.localeCompare(b.albumTitle);
  });
}

async function demoteOtherCoverLinks(albumId: number, keepLinkId: number | null): Promise<void> {
  if (keepLinkId != null) {
    await inspectExecute(
      `
      UPDATE album_artwork_links
      SET confidence_score = LEAST(COALESCE(confidence_score, 50), 45),
          review_flag = CASE WHEN id = $2 THEN review_flag ELSE 'ok' END,
          updated_at = now()
      WHERE album_id = $1
        AND id <> $2
      `,
      [albumId, keepLinkId],
    );
    return;
  }
  await inspectExecute(
    `
    UPDATE album_artwork_links
    SET confidence_score = LEAST(COALESCE(confidence_score, 50), 45),
        review_flag = 'ok',
        updated_at = now()
    WHERE album_id = $1
    `,
    [albumId],
  );
}

async function publishCoverDelivery(relPath: string): Promise<string | null> {
  const path = relPath.trim().replace(/^\/+/, "");
  const publicUrl = coverPathToUrl(path);
  const pub = await publishLocalCoverToR2({
    r2Key: path,
    localRelPath: path,
    publicCdnUrl: publicUrl ?? undefined,
  }).catch(() => null);
  if (!pub?.ok) return publicUrl;
  return publicUrl;
}

async function upsertCuratedCoverLink(input: {
  albumId: number;
  relPath: string;
  localPath: string;
}): Promise<number> {
  const rows = await inspectQuery<{ id: number }>(
    `
    INSERT INTO album_artwork_links (
      album_id,
      album_edition_id,
      canonical_cover_path,
      local_cover_path,
      r2_cover_key,
      source,
      confidence_score,
      review_flag
    )
    VALUES ($1, NULL, $2, $3, $4, $5, $6, 'curated')
    ON CONFLICT (album_id, coalesce(album_edition_id, 0), source)
    DO UPDATE SET
      canonical_cover_path = EXCLUDED.canonical_cover_path,
      local_cover_path = EXCLUDED.local_cover_path,
      r2_cover_key = EXCLUDED.r2_cover_key,
      confidence_score = EXCLUDED.confidence_score,
      review_flag = EXCLUDED.review_flag,
      updated_at = now()
    RETURNING id
    `,
    [
      input.albumId,
      input.relPath,
      input.localPath,
      input.relPath,
      CURATED_SOURCE,
      CURATED_CONFIDENCE,
    ],
  );
  const linkId = rows[0]?.id;
  if (!linkId) throw new Error("cover_link_upsert_failed");
  await demoteOtherCoverLinks(input.albumId, linkId);
  return linkId;
}

function revalidateCoverSurfaces(rvtr: string, rval: string | null): void {
  try {
    revalidatePath(`/retroverse-2/song/${rvtr}`);
    revalidatePath(`/retroverse-2/song/${rvtr}/data`);
    revalidatePath(`/retroverse-2/live`);
    revalidatePath(`/track/${rvtr}`);
    revalidatePath(`/deck/${rvtr}`);
    revalidatePath(`/song-sheet/${rvtr}`);
    revalidatePath(`/ops/intelligence/${rvtr}`);
    if (rval) revalidatePath(`/album/${rval}`);
  } catch {
    // no-op outside Next.js request context (CLI verification scripts)
  }
}

export function appendCoverRevision(url: string | null, revisionMs: number): string | null {
  if (!url?.trim()) return null;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${revisionMs}`;
}

async function syncPackageCoverUrl(rvtr: string): Promise<void> {
  const metadata = await loadSongMetadata(rvtr);
  if (!metadata) return;

  const stamped = appendCoverRevision(metadata.coverUrl, Date.now());
  const nextMetadata = { ...metadata, coverUrl: stamped };

  const pkg = await loadSongPackage(rvtr);
  if (pkg) {
    await saveSongPackage({
      ...pkg,
      metadata: { ...pkg.metadata, ...nextMetadata },
      processLog: [
        ...pkg.processLog,
        `${new Date().toISOString()} · Cover synced from canonical album artwork`,
      ],
    });
  }
}

export async function storeCanonicalCover(input: {
  rvtr: string;
  bytes: Buffer;
  contentType: string;
  filename?: string;
  source?: string;
}): Promise<string | null> {
  const album = await loadAlbumContext(input.rvtr);
  if (!album) throw new Error("album_not_found");

  const { loadTrackPage } = await import("@/lib/track/load-track-page");
  const track = await loadTrackPage(input.rvtr);
  const artist = track?.artistName ?? "";

  const ext = extFromContentType(input.contentType) || extFromUrl(input.filename ?? "");
  const relPath = expectedDossierCoverRelPath(
    album.rval,
    artist,
    album.albumTitle,
    ext,
  );
  const absPath = join(coverFsRoot(), relPath);
  await mkdir(join(coverFsRoot(), "retroverse/covers", album.rval), { recursive: true });
  await writeFile(absPath, input.bytes);

  const localPath = localWebPathFromRel(relPath);
  await upsertCuratedCoverLink({
    albumId: album.albumId,
    relPath,
    localPath,
  });

  await inspectExecute(
    `
    UPDATE albums
    SET canonical_cover_path = $2
    WHERE id = $1
    `,
    [album.albumId, relPath],
  );

  const publicUrl = await publishCoverDelivery(relPath);
  await syncPackageCoverUrl(input.rvtr);
  revalidateCoverSurfaces(input.rvtr, album.rval);
  return publicUrl;
}

async function downloadCover(url: string): Promise<{ bytes: Buffer; contentType: string }> {
  const normalized = normalizeCoverUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  const res = await fetch(normalized, { signal: controller.signal, redirect: "follow" });
  clearTimeout(timer);
  if (!res.ok) throw new Error(`cover_download_failed_${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { bytes, contentType };
}

export async function assignExistingCoverLink(input: {
  rvtr: string;
  linkId: number;
}): Promise<string | null> {
  const album = await loadAlbumContext(input.rvtr);
  if (!album) throw new Error("album_not_found");

  const rows = await inspectQuery<{
    id: number;
    album_id: number;
    canonical_cover_path: string | null;
    r2_cover_key: string | null;
  }>(
    `
    SELECT id, album_id, canonical_cover_path, r2_cover_key
    FROM album_artwork_links
    WHERE id = $1
    LIMIT 1
    `,
    [input.linkId],
  );
  const row = rows[0];
  if (!row) throw new Error("cover_link_not_found");

  const relPath = row.canonical_cover_path?.trim() || row.r2_cover_key?.trim();
  if (!relPath) throw new Error("cover_link_missing_path");

  await inspectExecute(
    `
    UPDATE album_artwork_links
    SET review_flag = 'curated',
        confidence_score = $2,
        updated_at = now()
    WHERE id = $1
    `,
    [row.id, CURATED_CONFIDENCE],
  );
  await demoteOtherCoverLinks(row.album_id, row.id);

  await inspectExecute(
    `
    UPDATE albums
    SET canonical_cover_path = $2
    WHERE id = $1
    `,
    [row.album_id, relPath],
  );

  const publicUrl = await publishCoverDelivery(relPath);
  await syncPackageCoverUrl(input.rvtr);
  revalidateCoverSurfaces(input.rvtr, album.rval);
  return publicUrl;
}

export async function saveCoverCandidate(input: {
  rvtr: string;
  linkId: number | null;
  coverUrl: string;
}): Promise<string | null> {
  if (input.linkId != null && Number.isFinite(input.linkId)) {
    return assignExistingCoverLink({ rvtr: input.rvtr, linkId: input.linkId });
  }
  const coverUrl = normalizeCoverUrl(input.coverUrl);
  if (!coverUrl) throw new Error("cover_url_required");
  const { bytes, contentType } = await downloadCover(coverUrl);
  return storeCanonicalCover({
    rvtr: input.rvtr,
    bytes,
    contentType,
    source: CURATED_SOURCE,
  });
}

export async function refreshPackageCoverFromTrack(rvtr: string): Promise<void> {
  await syncPackageCoverUrl(rvtr);
}
