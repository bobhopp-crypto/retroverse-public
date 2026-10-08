import "server-only";

import { loadPgJsonRedis, savePgJsonRedis } from "../../../lib/sunday-nights/pg-json-redis";
import {
  artistCreditKey,
  resolveArtistCredit,
  validateArtistProfileView,
  type ArtistDirectoryEntry,
  type ArtistProfileView,
} from "./artist-profile-contract";

const RVAR = /^RVAR\d{6}$/;
const profileKey = (rvar: string) => `rv:public:artist-profile:v1:${rvar}`;
const directoryKey = "rv:public:artist-profile-directory:v1";

export async function loadArtistProfile(rvar: string): Promise<ArtistProfileView | null> {
  const id = rvar.trim().toUpperCase();
  if (!RVAR.test(id)) return null;
  const raw = await loadPgJsonRedis({ redisKey: profileKey(id), pgKey: profileKey(id), allowNeonHydrate: false });
  return validateArtistProfileView(raw);
}

export async function saveArtistProfile(view: ArtistProfileView): Promise<void> {
  await savePgJsonRedis({ redisKey: profileKey(view.rvar), pgKey: profileKey(view.rvar), value: view as unknown as Record<string, unknown>, persistNeon: false });
}

export function validateArtistDirectory(raw: unknown): ArtistDirectoryEntry[] | null {
  if (!Array.isArray(raw) || raw.length > 10000) return null;
  const entries: ArtistDirectoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (typeof row.rvar !== "string" || !RVAR.test(row.rvar) || typeof row.name !== "string" ||
        !row.name.trim() || row.name.length > 160 || !Array.isArray(row.aliases) ||
        row.aliases.length > 20 || row.aliases.some((alias) => typeof alias !== "string" || alias.length > 160)) return null;
    if (seen.has(row.rvar)) return null;
    seen.add(row.rvar);
    entries.push({ rvar: row.rvar, name: row.name, aliases: row.aliases as string[] });
  }
  return entries;
}

export async function saveArtistDirectory(entries: ArtistDirectoryEntry[]): Promise<void> {
  await savePgJsonRedis({ redisKey: directoryKey, pgKey: directoryKey, value: { entries }, persistNeon: false });
}

export async function loadArtistDirectory(): Promise<ArtistDirectoryEntry[]> {
  const raw = await loadPgJsonRedis({ redisKey: directoryKey, pgKey: directoryKey, allowNeonHydrate: false });
  if (!raw || typeof raw !== "object") return [];
  return validateArtistDirectory((raw as { entries?: unknown }).entries) ?? [];
}

export async function resolvePublishedArtistCredit(credit: string): Promise<string | null> {
  if (!artistCreditKey(credit)) return null;
  return resolveArtistCredit(credit, await loadArtistDirectory());
}
