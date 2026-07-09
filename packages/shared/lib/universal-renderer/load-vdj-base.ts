/**
 * Universal Mobile Experience — VDJ Base Loader
 *
 * Builds a Level-0 (hero + credits) UniversalPackagePayload directly from
 * VirtualDJ's database.xml for songs that have no bundled Retroverse package.
 *
 * Two lookup keys are supported:
 *   - A 16-hex-char hash key derived from the file's normalised path
 *     (used by broadcast queue items that have no RVTR yet).
 *   - A canonical RVTR, matched against the VDJ Label field
 *     (used as the deepest fallback tier for the canonical Song Experience).
 *
 * Server-only (filesystem access).
 */
import "server-only";

import { createHash } from "node:crypto";

import { scanVdjDatabase, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";
import { loadBundledVdjRvtrEntry } from "@/lib/ops/intelligence/vdj-rvtr-index";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { resolveRvbrRendererTheme } from "@/lib/retroverse/rvbr/renderer-theme";

import type { RendererCard } from "./card-types";
import type { UniversalPackagePayload } from "./load-package";

const RVTR_RE = /RVTR\d{6}/i;

function rvtrFromLabel(label: string): string | null {
  const m = label.match(RVTR_RE);
  return m?.[0]?.toUpperCase() ?? null;
}

/** Reproduce the key formula used when building the broadcast queue. */
export function vdjBaseKey(filePathNorm: string): string {
  return createHash("sha256").update(filePathNorm).digest("hex").slice(0, 16);
}

export type MinimalVdjPackageMetadata = {
  rvtr: string;
  artist: string;
  title: string;
  album?: string | null;
  year?: number | null;
  coverUrl?: string | null;
  playCount?: number | null;
};

/** Level-0 UniversalRenderer payload from VirtualDJ tag metadata. */
export function buildMinimalPackageFromMetadata(
  meta: MinimalVdjPackageMetadata,
): UniversalPackagePayload | null {
  const artist = meta.artist.trim();
  const title = meta.title.trim();
  if (!artist || !title) return null;

  const year = meta.year ?? null;
  const rvtr = meta.rvtr.trim().toUpperCase();
  const coverUrl = meta.coverUrl?.trim() || null;
  const album = meta.album?.trim() || null;

  const cards: RendererCard[] = [
    { kind: "hero", artist, title, year, coverUrl },
    { kind: "credits", artist, title, rvtr, year },
  ];

  if (album) {
    cards.splice(1, 0, {
      kind: "album",
      albumTitle: album,
      year,
      coverUrl,
      artist,
    });
  }

  if ((meta.playCount ?? 0) > 0) {
    cards.splice(album ? 2 : 1, 0, {
      kind: "library_stats",
      playCount: meta.playCount ?? 0,
      peakHot100: null,
      chartWeeks: null,
      hasVdjMedia: true,
    });
  }

  return {
    rvtr,
    artist,
    title,
    year,
    cards,
    theme: resolveRvbrRendererTheme(year),
  };
}

function buildPayloadFromEntry(
  entry: VdjLibraryEntry,
  rvtrOverride?: string,
): UniversalPackagePayload | null {
  const rvtr = rvtrOverride ?? rvtrFromLabel(entry.label) ?? `VDJ:${vdjBaseKey(entry.filePathNorm)}`;
  return buildMinimalPackageFromMetadata({
    rvtr,
    artist: entry.artist,
    title: entry.title,
    album: entry.album,
    year: entry.year,
    playCount: entry.playCount,
  });
}

export async function loadVdjBasePackage(key: string): Promise<UniversalPackagePayload | null> {
  if (!/^[0-9a-f]{16}$/.test(key)) return null;

  const scan = await scanVdjDatabase();
  const entry = scan.entries.find((e) => vdjBaseKey(e.filePathNorm) === key);
  if (!entry) return null;

  return buildPayloadFromEntry(entry);
}

/**
 * Deepest fallback tier for the canonical Song Experience: find a VirtualDJ
 * library entry whose Label field carries this RVTR, and build the same
 * Level-0 hero + credits experience the hash-keyed lookup produces.
 */
export async function loadVdjBasePackageByRvtr(
  rvtr: string,
): Promise<UniversalPackagePayload | null> {
  const target = rvtr.trim().toUpperCase();
  if (!RVTR_RE.test(target)) return null;

  const scan = await scanVdjDatabase();
  const entry = scan.entries.find((e) => rvtrFromLabel(e.label) === target);
  if (!entry) return null;

  return buildPayloadFromEntry(entry, target);
}

/**
 * Production fallback when database.xml is unavailable: read build-time VDJ
 * metadata from vdj-rvtr-index.json and enrich cover from the Cover Library.
 */
export async function loadBundledVdjRvtrPackage(
  rvtr: string,
): Promise<UniversalPackagePayload | null> {
  const target = rvtr.trim().toUpperCase();
  if (!RVTR_RE.test(target)) return null;

  const entry = await loadBundledVdjRvtrEntry(target);
  if (!entry) return null;

  const coverMap = await loadCoverInfoForRvtrs([target]);
  const cover = coverMap.get(target);

  return buildMinimalPackageFromMetadata({
    rvtr: target,
    artist: entry.artist,
    title: entry.title,
    album: cover?.albumTitle ?? entry.album,
    year: entry.year,
    coverUrl: cover?.coverUrl ?? null,
  });
}
