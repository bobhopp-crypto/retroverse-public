/**
 * Universal Mobile Experience Renderer — Server-side Package Loader
 *
 * Reads a bundled SongPackage JSON and returns the card sequence for it.
 * Server-only (uses fs). Call from Next.js page server components only.
 */

import { readFile } from "fs/promises";

import { bundledSongPackagePath } from "@/lib/ops/intelligence/paths";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";

import {
  resolveRvbrRendererTheme,
  type RvbrRendererTheme,
} from "@/lib/retroverse/rvbr/renderer-theme";

import type { RendererCard } from "./card-types";
import { selectCards } from "./select-cards";

export type UniversalPackagePayload = {
  rvtr: string;
  artist: string;
  title: string;
  year: number | null;
  cards: RendererCard[];
  theme: RvbrRendererTheme;
};

/** Normalise RVTR — uppercase, no surrounding whitespace. */
function normalise(raw: string): string {
  return raw.trim().toUpperCase();
}

const RVTR_RE = /^RVTR\d{6}$/;

export async function loadUniversalPackage(
  rvtrRaw: string,
): Promise<UniversalPackagePayload | null> {
  const rvtr = normalise(rvtrRaw);
  if (!RVTR_RE.test(rvtr)) return null;

  const path = bundledSongPackagePath(rvtr);

  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return null;
  }

  let pkg: SongPackage;
  try {
    pkg = JSON.parse(raw) as SongPackage;
  } catch {
    return null;
  }

  if (!pkg.metadata?.artist || !pkg.metadata?.title) return null;

  const cards = selectCards(pkg);
  const year = pkg.metadata.year ?? null;

  return {
    rvtr,
    artist: pkg.metadata.artist,
    title: pkg.metadata.title,
    year,
    cards,
    theme: resolveRvbrRendererTheme(year),
  };
}
