import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";
import {
  normalizeRvTags,
  type RvTagId,
} from "@/lib/ops/rvtags-review/vocabulary";

/**
 * Canonical Retroverse Tags — keyed by RVTR, independent of VirtualDJ.
 *
 * VirtualDJ User2 is a downstream consumer (future write-back copies FROM here).
 * Performance Class (Fill/Cocktail/Dance/Slow) may sync to VDJ separately;
 * these tags always belong to the Retroverse track identity.
 */
export type RetroverseTagsRecord = {
  tags: RvTagId[];
  updatedAt: string;
};

export type RetroverseTagsStoreFile = {
  version: 1;
  tracks: Record<string, RetroverseTagsRecord>;
  updatedAt: string;
};

const RVTR_RE = /^RVTR\d{6}$/i;

export function normalizeRvtr(rvtr: string | null | undefined): string | null {
  const id = rvtr?.trim().toUpperCase() ?? "";
  return RVTR_RE.test(id) ? id : null;
}

function storePath(): string {
  return join(opsStateDir(), "retroverse-tags-by-rvtr.json");
}

function emptyStore(): RetroverseTagsStoreFile {
  const now = new Date().toISOString();
  return { version: 1, tracks: {}, updatedAt: now };
}

export function tagsForRvtr(
  store: RetroverseTagsStoreFile,
  rvtr: string | null | undefined,
): RvTagId[] {
  const id = normalizeRvtr(rvtr);
  if (!id) return [];
  return store.tracks[id]?.tags ?? [];
}

export async function loadRetroverseTagsStore(): Promise<RetroverseTagsStoreFile> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<RetroverseTagsStoreFile>;
    if (parsed.version !== 1 || !parsed.tracks || typeof parsed.tracks !== "object") {
      return emptyStore();
    }
    const tracks: Record<string, RetroverseTagsRecord> = {};
    for (const [key, value] of Object.entries(parsed.tracks)) {
      const id = normalizeRvtr(key);
      if (!id || !value || typeof value !== "object") continue;
      const tags = normalizeRvTags(
        Array.isArray((value as RetroverseTagsRecord).tags)
          ? (value as RetroverseTagsRecord).tags
          : [],
      );
      if (tags.length === 0) continue;
      tracks[id] = {
        tags,
        updatedAt:
          typeof (value as RetroverseTagsRecord).updatedAt === "string"
            ? (value as RetroverseTagsRecord).updatedAt
            : new Date().toISOString(),
      };
    }
    return {
      version: 1,
      tracks,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return emptyStore();
  }
}

export async function saveRetroverseTagsForRvtr(
  rvtr: string,
  tags: RvTagId[],
): Promise<RetroverseTagsStoreFile> {
  const id = normalizeRvtr(rvtr);
  if (!id) {
    throw new Error("Valid RVTR required to save Retroverse Tags");
  }

  const store = await loadRetroverseTagsStore();
  const normalized = normalizeRvTags(tags);
  const now = new Date().toISOString();
  const tracks = { ...store.tracks };

  if (normalized.length === 0) {
    delete tracks[id];
  } else {
    tracks[id] = { tags: normalized, updatedAt: now };
  }

  const next: RetroverseTagsStoreFile = { version: 1, tracks, updatedAt: now };
  const dir = opsStateDir();
  await mkdir(dir, { recursive: true });
  await writeFile(storePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
