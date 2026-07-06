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

function buildPayloadFromEntry(
  entry: VdjLibraryEntry,
  rvtrOverride?: string,
): UniversalPackagePayload | null {
  const artist = entry.artist.trim();
  const title = entry.title.trim();
  if (!artist || !title) return null;

  const year = entry.year;
  const rvtr = rvtrOverride ?? rvtrFromLabel(entry.label) ?? `VDJ:${vdjBaseKey(entry.filePathNorm)}`;

  const cards: RendererCard[] = [
    { kind: "hero", artist, title, year, coverUrl: null },
    { kind: "credits", artist, title, rvtr, year },
  ];

  if ((entry.playCount ?? 0) > 0) {
    cards.splice(1, 0, {
      kind: "library_stats",
      playCount: entry.playCount,
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
