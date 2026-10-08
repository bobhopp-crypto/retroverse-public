import "server-only";

import { deletePgJsonRedis, loadPgJsonRedis, savePgJsonRedis } from "../../../lib/sunday-nights/pg-json-redis";
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

/** Artist pages give Redis this long, then render the magazine shell without a profile. */
export const ARTIST_PROFILE_PAGE_BUDGET_MS = 400;

export async function loadArtistProfile(rvar: string): Promise<ArtistProfileView | null> {
  const id = rvar.trim().toUpperCase();
  if (!RVAR.test(id)) return null;
  const raw = await loadPgJsonRedis({ redisKey: profileKey(id), pgKey: profileKey(id), allowNeonHydrate: false });
  return validateArtistProfileView(raw);
}

export async function saveArtistProfile(view: ArtistProfileView): Promise<void> {
  await savePgJsonRedis({ redisKey: profileKey(view.rvar), pgKey: profileKey(view.rvar), value: view as unknown as Record<string, unknown>, persistNeon: false });
}

export async function deleteArtistProfile(rvar: string): Promise<void> {
  const id = rvar.trim().toUpperCase();
  if (!RVAR.test(id)) return;
  await deletePgJsonRedis({ redisKey: profileKey(id), pgKey: profileKey(id) });
}

function directoryExcludes(raw: Record<string, unknown> | null, rvar: string): boolean {
  if (!raw) return false;
  const directory = validateArtistDirectory((raw as { entries?: unknown }).entries);
  return Boolean(directory && !directory.some((entry) => entry.rvar === rvar));
}

/**
 * Page read. Aborts the Redis calls at the budget so a slow or down store cannot hold the magazine page.
 * A stored directory that no longer lists the RVAR hides a profile whose key was not deleted.
 */
export async function loadArtistProfileBounded(
  rvar: string,
  timeoutMs = ARTIST_PROFILE_PAGE_BUDGET_MS,
): Promise<ArtistProfileView | null> {
  const id = rvar.trim().toUpperCase();
  if (!RVAR.test(id)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const signal = controller.signal;
  const read = async (redisKey: string) => {
    try {
      return { ok: true as const, value: await loadPgJsonRedis({ redisKey, pgKey: redisKey, allowNeonHydrate: false, signal }) };
    } catch {
      return { ok: false as const, value: null };
    }
  };
  try {
    const [profileRead, directoryRead] = await Promise.all([read(profileKey(id)), read(directoryKey)]);
    if (!profileRead.ok) return null;
    const view = validateArtistProfileView(profileRead.value);
    if (!view) return null;
    if (directoryRead.ok && directoryExcludes(directoryRead.value, id)) return null;
    return view;
  } finally {
    clearTimeout(timer);
  }
}

export function validateArtistRemovals(raw: unknown): string[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > 200) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string") return null;
    const id = item.trim().toUpperCase();
    if (!RVAR.test(id) || seen.has(id)) return null;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export async function applyArtistProfileSync(input: {
  profiles: ArtistProfileView[];
  directory?: ArtistDirectoryEntry[];
  remove: string[];
}): Promise<{ count: number; removed: string[]; directory: ArtistDirectoryEntry[] }> {
  const dropped = new Set(input.remove);
  if (input.directory) {
    const previous = await loadArtistDirectory();
    const keep = new Set(input.directory.map((entry) => entry.rvar));
    for (const entry of previous) {
      if (!keep.has(entry.rvar)) dropped.add(entry.rvar);
    }
  }
  for (const rvar of dropped) await deleteArtistProfile(rvar);
  let count = 0;
  for (const profile of input.profiles) {
    if (dropped.has(profile.rvar)) continue;
    await saveArtistProfile(profile);
    count += 1;
  }
  if (input.directory) {
    await saveArtistDirectory(input.directory.filter((entry) => !dropped.has(entry.rvar)));
  } else if (dropped.size > 0) {
    const current = await loadArtistDirectory();
    const next = current.filter((entry) => !dropped.has(entry.rvar));
    if (next.length !== current.length) await saveArtistDirectory(next);
  }
  return { count, removed: [...dropped], directory: await loadArtistDirectory() };
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
