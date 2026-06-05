import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import { matchAliasKey, normalizeMatchText } from "./normalize-match-key";

const RE_RVTR = /^RVTR\d{6}$/i;

export type RvtrAliasRecord = {
  artist: string;
  title: string;
  rvtr: string;
  path: string | null;
  createdAt: string;
};

export type RvtrAliasStoreFile = {
  version: 1;
  aliases: Record<string, RvtrAliasRecord>;
  updatedAt: string;
};

function storePath(): string {
  return join(opsStateDir(), "sunday-nights", "rvtr-aliases.json");
}

function emptyStore(): RvtrAliasStoreFile {
  const now = new Date().toISOString();
  return { version: 1, aliases: {}, updatedAt: now };
}

function normalizeRvtr(rvtr: string): string | null {
  const id = rvtr.trim().toUpperCase();
  return RE_RVTR.test(id) ? id : null;
}

export async function loadRvtrAliasStore(): Promise<RvtrAliasStoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RvtrAliasStoreFile>;
    if (parsed.version !== 1 || !parsed.aliases || typeof parsed.aliases !== "object") {
      return emptyStore();
    }
    const aliases: Record<string, RvtrAliasRecord> = {};
    for (const [key, value] of Object.entries(parsed.aliases)) {
      if (!value || typeof value !== "object") continue;
      const rvtr = normalizeRvtr(value.rvtr ?? "");
      if (!rvtr) continue;
      const artist = typeof value.artist === "string" ? value.artist.trim() : "";
      const title = typeof value.title === "string" ? value.title.trim() : "";
      if (!artist || !title) continue;
      aliases[key] = {
        artist,
        title,
        rvtr,
        path: typeof value.path === "string" && value.path.trim() ? value.path.trim() : null,
        createdAt:
          typeof value.createdAt === "string" && value.createdAt.trim()
            ? value.createdAt
            : new Date().toISOString(),
      };
    }
    return {
      version: 1,
      aliases,
      updatedAt:
        typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return emptyStore();
  }
}

export async function saveRvtrAlias(input: {
  artist: string;
  title: string;
  rvtr: string;
  path?: string | null;
}): Promise<RvtrAliasRecord> {
  const artist = input.artist.trim();
  const title = input.title.trim();
  const rvtr = normalizeRvtr(input.rvtr);
  if (!artist || !title || !rvtr) {
    throw new Error("Invalid alias — artist, title, and RVTR required.");
  }

  const store = await loadRvtrAliasStore();
  const key = matchAliasKey(artist, title);
  const record: RvtrAliasRecord = {
    artist,
    title,
    rvtr,
    path: input.path?.trim() || null,
    createdAt: new Date().toISOString(),
  };
  store.aliases[key] = record;
  store.updatedAt = record.createdAt;

  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return record;
}

export function lookupAliasRvtrFromStore(
  store: RvtrAliasStoreFile,
  artist: string,
  title: string,
): string | null {
  const direct = store.aliases[matchAliasKey(artist, title)];
  if (direct?.rvtr) return direct.rvtr;

  const artistNorm = normalizeMatchText(artist);
  const titleNorm = normalizeMatchText(title);
  for (const record of Object.values(store.aliases)) {
    if (
      normalizeMatchText(record.artist) === artistNorm &&
      normalizeMatchText(record.title) === titleNorm
    ) {
      return record.rvtr;
    }
  }
  return null;
}

export async function lookupAliasRvtr(artist: string, title: string): Promise<string | null> {
  const store = await loadRvtrAliasStore();
  return lookupAliasRvtrFromStore(store, artist, title);
}

export function aliasesMatchingQuery(
  store: RvtrAliasStoreFile,
  query: string,
): RvtrAliasRecord[] {
  const q = normalizeMatchText(query);
  if (!q) return [];
  return Object.values(store.aliases).filter((record) => {
    const artist = normalizeMatchText(record.artist);
    const title = normalizeMatchText(record.title);
    const rvtr = record.rvtr.toLowerCase();
    return artist.includes(q) || title.includes(q) || rvtr.includes(q);
  });
}
