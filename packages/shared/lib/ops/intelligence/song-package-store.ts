import { mkdir, readFile, unlink, writeFile } from "fs/promises";

import {
  bundledSongPackageIndexPath,
  bundledSongPackagePath,
  songPackageIndexPath,
  songPackagePath,
  songPackagesDir,
} from "./paths";
import { buildPackageIntel, emptyPackageIntel } from "./package-intel";
import type {
  SongPackage,
  SongPackageIndex,
  SongPackageMetadata,
  SongPackageStatus,
} from "./song-package-types";

const RVTR_RE = /^(?:DK_|PK_)?(RVTR\d{6})$/i;

export function normalizePackageRvtr(rvtr: string): string | null {
  const match = rvtr.trim().toUpperCase().match(RVTR_RE);
  return match?.[1] ?? null;
}

function emptyIndex(): SongPackageIndex {
  const now = new Date().toISOString();
  return { version: 2, updatedAt: now, packages: [] };
}

/** Migrate Phase 1 package shape to Phase 2. */
function migrateV1ToV2(raw: Record<string, unknown>, id: string): SongPackage | null {
  const metadata = raw.metadata as SongPackageMetadata | undefined;
  if (!metadata?.rvtr) return null;

  const now = new Date().toISOString();
  return {
    version: 2,
    rvtr: id,
    status: (raw.status as SongPackageStatus) ?? "draft",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
    processedAt: typeof raw.processedAt === "string" ? raw.processedAt : null,
    approvedAt: typeof raw.approvedAt === "string" ? raw.approvedAt : null,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
    processLog: Array.isArray(raw.processLog) ? (raw.processLog as string[]) : [],
    metadata,
    researchVault: Array.isArray(raw.researchVault) ? (raw.researchVault as SongPackage["researchVault"]) : [],
    candidateFacts: Array.isArray(raw.candidateFacts)
      ? (raw.candidateFacts as SongPackage["candidateFacts"])
      : [],
    candidateStories: Array.isArray(raw.candidateStories)
      ? (raw.candidateStories as SongPackage["candidateStories"])
      : [],
    storyCards: Array.isArray(raw.storyCards) ? (raw.storyCards as SongPackage["storyCards"]) : [],
    intel:
      raw.intel && typeof raw.intel === "object"
        ? (raw.intel as SongPackage["intel"])
        : emptyPackageIntel(),
  };
}

export async function loadSongPackageIndex(): Promise<SongPackageIndex> {
  for (const path of [songPackageIndexPath(), bundledSongPackageIndexPath()]) {
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as Partial<SongPackageIndex>;
      if (!Array.isArray(parsed.packages)) continue;
      return {
        version: 2,
        updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
        packages: parsed.packages,
      };
    } catch {
      /* try next package store */
    }
  }
  return emptyIndex();
}

async function saveSongPackageIndex(index: SongPackageIndex): Promise<void> {
  await mkdir(songPackagesDir(), { recursive: true });
  await writeFile(songPackageIndexPath(), `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

async function upsertIndexEntry(pkg: SongPackage): Promise<void> {
  const index = await loadSongPackageIndex();
  const now = new Date().toISOString();
  const entry = {
    rvtr: pkg.rvtr,
    title: pkg.metadata.title,
    artist: pkg.metadata.artist,
    status: pkg.status,
    updatedAt: pkg.updatedAt,
  };
  const rest = index.packages.filter((p) => p.rvtr !== pkg.rvtr);
  await saveSongPackageIndex({
    version: 2,
    updatedAt: now,
    packages: [entry, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  });
}

export async function loadSongPackage(rvtr: string): Promise<SongPackage | null> {
  const id = normalizePackageRvtr(rvtr);
  if (!id) return null;

  for (const path of [songPackagePath(id), bundledSongPackagePath(id)]) {
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed.version === 2 && parsed.rvtr === id) {
        const pkg = parsed as unknown as SongPackage;
        return {
          ...pkg,
          publishedAt: pkg.publishedAt ?? null,
          metadata: {
            ...pkg.metadata,
            relatedArtists: pkg.metadata.relatedArtists ?? [],
            tags: pkg.metadata.tags ?? [],
          },
          issueFlags: pkg.issueFlags ?? [],
          intel: pkg.intel ?? buildPackageIntel(pkg as SongPackage),
        };
      }
      if (parsed.version === 1 && parsed.rvtr === id) {
        return migrateV1ToV2(parsed, id);
      }
    } catch {
      /* try next package store */
    }
  }

  return null;
}

export async function saveSongPackage(pkg: SongPackage): Promise<SongPackage> {
  const id = normalizePackageRvtr(pkg.rvtr);
  if (!id) throw new Error("Valid RVTR required");
  const next: SongPackage = { ...pkg, version: 2, rvtr: id, updatedAt: new Date().toISOString() };
  await mkdir(songPackagesDir(), { recursive: true });
  await writeFile(songPackagePath(id), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  await upsertIndexEntry(next);
  return next;
}

export async function deleteSongPackage(rvtr: string): Promise<boolean> {
  const id = normalizePackageRvtr(rvtr);
  if (!id) throw new Error("Valid RVTR required");

  let deleted = false;
  try {
    await unlink(songPackagePath(id));
    deleted = true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw err;
  }

  const index = await loadSongPackageIndex();
  const nextPackages = index.packages.filter((p) => p.rvtr !== id);
  if (nextPackages.length !== index.packages.length) {
    await saveSongPackageIndex({
      version: 2,
      updatedAt: new Date().toISOString(),
      packages: nextPackages,
    });
    deleted = true;
  }

  return deleted;
}

export function createEmptySongPackage(metadata: SongPackageMetadata): SongPackage {
  const now = new Date().toISOString();
  return {
    version: 2,
    rvtr: metadata.rvtr,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    processedAt: null,
    approvedAt: null,
    publishedAt: null,
    processLog: [],
    metadata,
    researchVault: [],
    candidateFacts: [],
    candidateStories: [],
    storyCards: [],
    intel: emptyPackageIntel(),
    issueFlags: [],
  };
}

export async function updateSongPackageStatus(
  rvtr: string,
  status: SongPackageStatus,
): Promise<SongPackage | null> {
  const pkg = await loadSongPackage(rvtr);
  if (!pkg) return null;
  const now = new Date().toISOString();
  const next: SongPackage = {
    ...pkg,
    status,
    updatedAt: now,
    approvedAt: status === "approved" || status === "published" ? now : pkg.approvedAt,
    publishedAt: status === "published" ? now : pkg.publishedAt,
  };
  return saveSongPackage(next);
}
