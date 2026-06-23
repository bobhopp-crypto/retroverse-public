import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { resolveAlbumCoverUrlFromRow } from "@/lib/artwork/resolve-album-cover-url";
import { coverPathToUrl } from "@/lib/artist/cover-url";
import { expectedDossierCoverRelPath } from "@/lib/covers/backfill/dossier-path";
import { coverFsRoot } from "@/lib/covers/backfill/paths";
import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

import { loadCoverInfoForRvtrs } from "./load-rvtr-covers";
import { probeExternalCovers } from "./cover-recovery-probes";
import type { TopPlayedTrack } from "./top-played-backfill";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const AUTO_RECOVER_THRESHOLD = 78;
const REVIEW_THRESHOLD = 55;

type CoverCandidate = {
  coverUrl: string;
  coverSource: string;
  confidence: number;
  resolution: string | null;
};

export type CoverRecoveryOutcome = "recovered" | "review_needed" | "failed";

export type CoverRecoveryProbeStep = {
  source: string;
  hit: boolean;
  note: string;
};

export type CoverRecoveryEntry = {
  rvtr: string;
  title: string;
  artist: string;
  playCount: number;
  filePath: string;
  outcome: CoverRecoveryOutcome;
  coverUrl: string | null;
  coverSource: string | null;
  confidence: number;
  resolution: string | null;
  validationStatus: string;
  probes: CoverRecoveryProbeStep[];
  updatedAt: string;
};

export type CoverRecoveryQueueFile = {
  version: 1;
  scope: "top100" | "video-factory";
  updatedAt: string;
  entries: CoverRecoveryEntry[];
  summary: {
    total: number;
    recovered: number;
    reviewNeeded: number;
    failed: number;
  };
};

type AlbumContext = {
  rvtr: string;
  albumId: number | null;
  albumTitle: string | null;
  releaseYear: number | null;
  rval: string | null;
  artist: string;
  title: string;
};

async function loadAlbumContext(rvtr: string): Promise<AlbumContext | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  const rows = await inspectQuery<{
    rvtr: string;
    artist: string;
    title: string;
    album_id: number | null;
    album_title: string | null;
    release_year: number | null;
    rval: string | null;
  }>(
    `
    SELECT
      upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr,
      ctd.canonical_artist_name AS artist,
      ctd.canonical_title AS title,
      al.id AS album_id,
      al.title AS album_title,
      al.release_year,
      (
        SELECT upper(trim(aek.external_key))
        FROM album_external_keys aek
        WHERE aek.album_id = al.id
        ORDER BY aek.external_key ASC
        LIMIT 1
      ) AS rval
    FROM canonical_track_display ctd
    LEFT JOIN canonical_album_tracks cat
      ON upper(trim(cat.canonical_track_key)) = upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text)))
    LEFT JOIN albums al ON al.id = cat.album_id
    WHERE upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) = upper(trim($1))
    ORDER BY cat.position ASC NULLS LAST
    LIMIT 1
    `,
    [rvtr],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    rvtr: row.rvtr,
    albumId: row.album_id,
    albumTitle: row.album_title,
    releaseYear: row.release_year,
    rval: row.rval,
    artist: row.artist,
    title: row.title,
  };
}

async function listLocalCoverFiles(rval: string): Promise<string[]> {
  const id = rval.trim().toUpperCase();
  const dir = join(coverFsRoot(), "retroverse", "covers", id);
  if (!existsSync(dir)) return [];
  try {
    const names = await readdir(dir);
    return names.filter((n) => IMAGE_EXT.test(n)).map((n) => `retroverse/covers/${id}/${n}`);
  } catch {
    return [];
  }
}

function classifyOutcome(confidence: number): CoverRecoveryOutcome {
  if (confidence >= AUTO_RECOVER_THRESHOLD) return "recovered";
  if (confidence >= REVIEW_THRESHOLD) return "review_needed";
  return "failed";
}

function albumTitleEvidenceMatch(
  albumTitle: string,
  coverSource: string,
  resolution: string | null,
): boolean {
  if (resolution === "canonical") return true;
  const src = coverSource.toLowerCase();
  if (src.includes("retroverse") || src.includes("dossier") || src.includes("album artwork")) {
    return true;
  }
  if (src.includes("exact") || src.includes("album title match")) return true;
  return false;
}

function validationLabel(outcome: CoverRecoveryOutcome, source: string | null): string {
  if (outcome === "recovered") return `auto_validated · ${source ?? "unknown"}`;
  if (outcome === "review_needed") return `pending_review · ${source ?? "candidate"}`;
  return "no_cover_found";
}

/** Run automated cover recovery for one missing-cover track. */
export async function recoverCoverForTrack(
  track: TopPlayedTrack,
  options?: { skipExternal?: boolean },
): Promise<CoverRecoveryEntry> {
  const probes: CoverRecoveryProbeStep[] = [];
  const rvtr = track.rvtr?.trim().toUpperCase() ?? "";
  const now = new Date().toISOString();

  if (!rvtr) {
    return {
      rvtr: "",
      title: track.title,
      artist: track.artist,
      playCount: track.playCount,
      filePath: track.filePath,
      outcome: "failed",
      coverUrl: null,
      coverSource: null,
      confidence: 0,
      resolution: null,
      validationStatus: "no_rvtr",
      probes: [{ source: "rvtr", hit: false, note: "No RVTR — cannot link cover" }],
      updatedAt: now,
    };
  }

  const candidates: CoverCandidate[] = [];
  const addCandidate = (c: CoverCandidate) => {
    candidates.push(c);
  };

  const coverLib = await loadCoverInfoForRvtrs([rvtr]);
  const lib = coverLib.get(rvtr);
  if (lib?.coverUrl) {
    probes.push({ source: "retroverse_cover_library", hit: true, note: lib.coverSource ?? "linked" });
    addCandidate({
      coverUrl: lib.coverUrl,
      coverSource: lib.coverSource ?? "Retroverse Cover Library",
      confidence: 100,
      resolution: "canonical",
    });
  } else {
    probes.push({ source: "retroverse_cover_library", hit: false, note: "No linked cover" });
  }

  const ctx = await loadAlbumContext(rvtr);
  const albumTitle = ctx?.albumTitle ?? track.title;
  const artist = ctx?.artist ?? track.artist;
  const releaseYear = ctx?.releaseYear ?? null;

  if (ctx?.albumId) {
    const links = await inspectQuery<{
      canonical_cover_path: string | null;
      local_cover_path: string | null;
      r2_cover_key: string | null;
      review_flag: string | null;
      source: string | null;
      confidence_score: number | null;
    }>(
      `
      SELECT canonical_cover_path, local_cover_path, r2_cover_key, review_flag, source, confidence_score
      FROM album_artwork_links
      WHERE album_id = $1
      ORDER BY (review_flag IN ('curated', 'ok')) DESC, confidence_score DESC NULLS LAST
      `,
      [ctx.albumId],
    );

    let linkHit = false;
    for (const link of links) {
      const url = resolveAlbumCoverUrlFromRow({
        cover_path: link.canonical_cover_path,
        artwork_path: link.canonical_cover_path,
        r2_cover_key: link.r2_cover_key,
      });
      const localUrl = link.local_cover_path ? coverPathToUrl(link.local_cover_path) : null;
      const resolved = url ?? localUrl;
      if (!resolved) continue;
      linkHit = true;
      const curated = link.review_flag === "curated" || link.review_flag === "ok";
      addCandidate({
        coverUrl: resolved,
        coverSource: `Unlinked Artwork · ${link.source ?? "album_artwork_links"}`,
        confidence: curated ? 96 : 84,
        resolution: link.r2_cover_key ? "R2" : "local",
      });
    }
    probes.push({
      source: "unlinked_artwork_links",
      hit: linkHit,
      note: linkHit ? `${links.length} link rows scanned` : "No usable artwork link paths",
    });

    const staging = await inspectQuery<{ canonical_cover_path: string | null; r2_cover_key: string | null }>(
      `
      SELECT canonical_cover_path, r2_cover_key
      FROM staging_album_artwork_link_buffer
      WHERE album_id = $1
      ORDER BY id DESC NULLS LAST
      LIMIT 3
      `,
      [ctx.albumId],
    ).catch(() => [] as Array<{ canonical_cover_path: string | null; r2_cover_key: string | null }>);
    let cacheHit = false;
    for (const row of staging) {
      const url = resolveAlbumCoverUrlFromRow({
        cover_path: row.canonical_cover_path,
        artwork_path: row.canonical_cover_path,
        r2_cover_key: row.r2_cover_key,
      });
      if (!url) continue;
      cacheHit = true;
      addCandidate({
        coverUrl: url,
        coverSource: "Prior Artwork Cache (staging)",
        confidence: 88,
        resolution: "staging",
      });
    }
    probes.push({
      source: "prior_artwork_cache",
      hit: cacheHit,
      note: cacheHit ? "staging buffer hit" : "No staging rows",
    });
  }

  if (ctx?.rval) {
    const localFiles = await listLocalCoverFiles(ctx.rval);
    const expected = expectedDossierCoverRelPath(ctx.rval, artist, albumTitle ?? "");
    const expectedAbs = join(coverFsRoot(), expected.replace(/^\/+/, ""));
    const paths = [...localFiles];
    if (existsSync(expectedAbs)) paths.push(expected);

    if (paths.length > 0) {
      const rel = paths[0]!;
      const url = coverPathToUrl(rel);
      if (url) {
        addCandidate({
          coverUrl: url,
          coverSource: "Local Dossier Cache",
          confidence: 94,
          resolution: "filesystem",
        });
      }
      probes.push({ source: "local_dossier_cache", hit: Boolean(url), note: `${paths.length} files` });
    } else {
      probes.push({ source: "local_dossier_cache", hit: false, note: "No dossier files" });
    }
  }

  const mediaRows = await inspectQuery<{ source_path: string | null; r2_media_key: string | null }>(
    `
    SELECT ma.source_path, ma.r2_media_key
    FROM media_assets ma
    WHERE lower(replace(replace(coalesce(ma.source_path, ''), '\\', '/'), '//', '/'))
      = lower(replace(replace($1, '\\', '/'), '//', '/'))
    LIMIT 1
    `,
    [track.filePath],
  );
  const media = mediaRows[0];
  if (media?.r2_media_key && IMAGE_EXT.test(media.r2_media_key)) {
    const url = coverPathToUrl(null, media.r2_media_key) ?? media.r2_media_key;
        addCandidate({
      coverUrl: url,
      coverSource: "media_assets R2 artwork",
      confidence: 80,
      resolution: "media",
    });
    probes.push({ source: "media_assets_artwork", hit: true, note: media.r2_media_key });
  } else {
    probes.push({ source: "media_assets_artwork", hit: false, note: "No image asset on media row" });
  }

  let best = candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  if (!options?.skipExternal && (!best || best.confidence < AUTO_RECOVER_THRESHOLD)) {
    const external = await probeExternalCovers(artist, albumTitle ?? track.title, releaseYear, track.title);
    if (external) {
      addCandidate({
        coverUrl: external.coverUrl,
        coverSource: external.coverSource,
        confidence: external.confidence,
        resolution: external.resolution,
      });
      probes.push({
        source: external.coverSource,
        hit: true,
        note: external.note,
      });
    } else {
      probes.push({ source: "external_lookup", hit: false, note: "iTunes · MB · Discogs — no hit" });
    }
  }

  best = candidates.sort((a, b) => b.confidence - a.confidence)[0] ?? null;

  // Safety: album-title evidence required for auto-recovery (no artist-only canonical covers).
  if (
    best &&
    best.confidence >= AUTO_RECOVER_THRESHOLD &&
    best.resolution !== "canonical" &&
    !best.coverSource.toLowerCase().includes("retroverse") &&
    !albumTitleEvidenceMatch(albumTitle, best.coverSource, best.resolution)
  ) {
    best = { ...best, confidence: Math.min(best.confidence, REVIEW_THRESHOLD + 2) };
  }

  if (!best) {
    return {
      rvtr,
      title: track.title,
      artist: track.artist,
      playCount: track.playCount,
      filePath: track.filePath,
      outcome: "failed",
      coverUrl: null,
      coverSource: null,
      confidence: 0,
      resolution: null,
      validationStatus: validationLabel("failed", null),
      probes,
      updatedAt: now,
    };
  }

  const outcome = classifyOutcome(best.confidence);
  return {
    rvtr,
    title: track.title,
    artist: track.artist,
    playCount: track.playCount,
    filePath: track.filePath,
    outcome,
    coverUrl: best.coverUrl,
    coverSource: best.coverSource,
    confidence: best.confidence,
    resolution: best.resolution,
    validationStatus: validationLabel(outcome, best.coverSource),
    probes,
    updatedAt: now,
  };
}

export function buildRecoverySummary(entries: CoverRecoveryEntry[]): CoverRecoveryQueueFile["summary"] {
  return {
    total: entries.length,
    recovered: entries.filter((e) => e.outcome === "recovered").length,
    reviewNeeded: entries.filter((e) => e.outcome === "review_needed").length,
    failed: entries.filter((e) => e.outcome === "failed").length,
  };
}
