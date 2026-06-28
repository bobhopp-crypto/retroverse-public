import "server-only";

import { readFile } from "fs/promises";
import { join } from "path";

import { bundledIntelligenceRoot } from "@/lib/ops/intelligence/paths";
import { normalizeRvtr } from "@/lib/studio/status";

export type MuseumPilotSong = {
  rvtr: string;
  artist: string;
  title: string;
  playCount: number | null;
  tier: "strict" | "expanded" | "unknown";
};

export type MuseumPilotRegistry = {
  version: 1;
  generatedAt: string;
  targetCount: number;
  actualCount: number;
  selectionCriteria: {
    playCountMin: number;
    playCountMax: number;
    expandedPlayCountMin: number;
    requiresVideo: boolean;
    requiresFrames: number;
    requiresPackage: boolean;
  };
  showcaseRvtr: string;
  songs: MuseumPilotSong[];
};

export function museumPilotRegistryPath(): string {
  return join(bundledIntelligenceRoot(), "museum-pilot.json");
}

export async function loadMuseumPilotRegistry(): Promise<MuseumPilotRegistry | null> {
  try {
    const raw = await readFile(museumPilotRegistryPath(), "utf8");
    return JSON.parse(raw) as MuseumPilotRegistry;
  } catch {
    return null;
  }
}

export async function isMuseumPilotRvtr(rvtr: string): Promise<boolean> {
  const normalized = normalizeRvtr(rvtr);
  if (!normalized) return false;
  const registry = await loadMuseumPilotRegistry();
  if (!registry) return false;
  return registry.songs.some((song) => song.rvtr === normalized);
}

export function showcaseRvtrFromRegistry(registry: MuseumPilotRegistry | null): string {
  return registry?.showcaseRvtr?.trim().toUpperCase() ?? "RVTR417030";
}
