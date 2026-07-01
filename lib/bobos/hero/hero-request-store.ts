import { copyFile, mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import {
  loadSongPackage,
  normalizePackageRvtr,
  saveSongPackage,
} from "@/lib/ops/intelligence/song-package-store";
import type { SongPackage, StoredVisualProfile } from "@/lib/ops/intelligence/song-package-types";

import {
  heroOutputFilePath,
  heroPublicDir,
  heroPublicFilePath,
  heroPublicUrl,
  heroRequestPath,
  heroRequestsDir,
} from "./paths";
import { buildHeroPromptFromPackage } from "./prompt-builder";
import type { HeroRequest, HeroRequestStatus } from "./types";
import { HERO_IMAGE_SPECS } from "./types";

function stripRuntimeFields(pkg: SongPackage): SongPackage {
  const { visualProfile: _visualProfile, ...rest } = pkg;
  return rest;
}

export async function loadHeroRequest(rvtrParam: string): Promise<HeroRequest | null> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return null;

  try {
    const raw = await readFile(heroRequestPath(rvtr), "utf8");
    return JSON.parse(raw) as HeroRequest;
  } catch {
    return null;
  }
}

export async function saveHeroRequest(request: HeroRequest): Promise<HeroRequest> {
  await mkdir(heroRequestsDir(), { recursive: true });
  const next = { ...request, updatedAt: new Date().toISOString() };
  await writeFile(heroRequestPath(request.rvtr), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function createHeroRequest(
  rvtrParam: string,
  prompt: string,
): Promise<HeroRequest> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) throw new Error("Valid RVTR required.");

  const raw = await loadSongPackage(rvtr);
  if (!raw) throw new Error("Song package not found.");

  const pkg = hydratePackageIntel(raw);
  const now = new Date().toISOString();
  const trimmedPrompt = prompt.trim() || buildHeroPromptFromPackage(pkg);

  const request: HeroRequest = {
    version: 1,
    rvtr,
    songTitle: pkg.metadata.title,
    artist: pkg.metadata.artist,
    prompt: trimmedPrompt,
    outputPath: heroOutputFilePath(rvtr),
    outputUrl: null,
    createdAt: now,
    updatedAt: now,
    status: "pending_renderer",
    specs: HERO_IMAGE_SPECS,
  };

  return saveHeroRequest(request);
}

async function copyHeroImage(sourcePath: string, rvtr: string): Promise<string> {
  const publicPath = heroPublicFilePath(rvtr);
  const canonicalPath = heroOutputFilePath(rvtr);

  await mkdir(heroPublicDir(), { recursive: true });
  await mkdir(canonicalPath.replace(/[/\\][^/\\]+$/, ""), { recursive: true });

  await copyFile(sourcePath, publicPath);
  try {
    await copyFile(sourcePath, canonicalPath);
  } catch {
    /* package dir may be read-only bundled copy — public path is sufficient for v0.1 */
  }

  return heroPublicUrl(rvtr, Date.now().toString());
}

export async function assignPrimaryHeroFromFile(
  rvtrParam: string,
  sourcePath: string,
): Promise<{ request: HeroRequest; pkg: SongPackage }> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) throw new Error("Valid RVTR required.");
  if (!existsSync(sourcePath)) throw new Error(`Image not found: ${sourcePath}`);

  const raw = await loadSongPackage(rvtr);
  if (!raw) throw new Error("Song package not found.");

  const outputUrl = await copyHeroImage(sourcePath, rvtr);
  const stored: StoredVisualProfile = {
    ...(raw.storedVisualProfile ?? {}),
    primaryHeroUrl: outputUrl,
    statusOverride: "complete",
  };

  const saved = await saveSongPackage(
    stripRuntimeFields({
      ...raw,
      storedVisualProfile: stored,
      updatedAt: new Date().toISOString(),
    }),
  );

  const existing = await loadHeroRequest(rvtr);
  const now = new Date().toISOString();
  const request: HeroRequest = existing
    ? {
        ...existing,
        prompt: existing.prompt,
        outputUrl,
        updatedAt: now,
        status: "assigned" satisfies HeroRequestStatus,
      }
    : {
        version: 1,
        rvtr,
        songTitle: saved.metadata.title,
        artist: saved.metadata.artist,
        prompt: buildHeroPromptFromPackage(hydratePackageIntel(saved)),
        outputPath: heroOutputFilePath(rvtr),
        outputUrl,
        createdAt: now,
        updatedAt: now,
        status: "assigned",
        specs: HERO_IMAGE_SPECS,
      };

  await saveHeroRequest(request);

  return { request, pkg: hydratePackageIntel(saved) };
}
