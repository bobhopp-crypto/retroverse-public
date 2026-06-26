import "server-only";

import { basename, join } from "path";
import { readFile, readdir } from "fs/promises";

import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import { songPackagesDir } from "@/lib/ops/intelligence/paths";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";

import type { Bp2PackageHint } from "./types";

function activeStoryCount(pkg: SongPackage): number {
  const candidates = pkg.candidateStories.filter((s) => s.reviewStatus !== "rejected").length;
  if (candidates > 0) return candidates;
  return pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length;
}

function activeFactCount(pkg: SongPackage): number {
  const facts = pkg.candidateFacts.filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId).length;
  if (facts > 0) return facts;
  return pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length;
}

function artifactReadyCount(pkg: SongPackage, storyCount: number): number {
  const intel = pkg.intel;
  let ready = 0;
  if (pkg.metadata.coverUrl) ready += 1;
  if ((intel?.chartHistory.length ?? 0) > 0) ready += 1;
  if (storyCount > 0) ready += 1;
  if (pkg.candidateFacts.some((f) => f.category === "artist" && f.reviewStatus !== "rejected")) ready += 1;
  if ((intel?.timelineEvents.length ?? 0) >= 2) ready += 1;
  if (pkg.metadata.albumTitle) ready += 1;
  if (pkg.metadata.hasVdjMedia || pkg.metadata.videoInfo) ready += 1;
  return ready;
}

export async function loadBp2PackageHints(): Promise<Map<string, Bp2PackageHint>> {
  const out = new Map<string, Bp2PackageHint>();
  let files: string[] = [];
  try {
    files = await readdir(songPackagesDir());
  } catch {
    return out;
  }

  await Promise.all(
    files
      .filter((file) => /^RVTR\d{6}\.json$/i.test(file))
      .map(async (file) => {
        try {
          const raw = await readFile(join(songPackagesDir(), file), "utf8");
          const pkg = JSON.parse(raw) as SongPackage;
          const rvtr = (pkg.rvtr ?? basename(file, ".json")).trim().toUpperCase();
          if (!/^RVTR\d{6}$/.test(rvtr)) return;

          const storyCount = activeStoryCount(pkg);
          const intel = pkg.intel;
          const status = pkg.status ?? "draft";
          const artistFactCount = pkg.candidateFacts.filter(
            (f) => f.category === "artist" && f.reviewStatus !== "rejected" && !f.mergedIntoId,
          ).length;

          out.set(rvtr, {
            rvtr,
            status,
            storyCount,
            factCount: activeFactCount(pkg),
            artifactReadyCount: artifactReadyCount(pkg, storyCount),
            chartHistoryCount: intel?.chartHistory.length ?? 0,
            relatedSongsCount: 0,
            artistFactCount,
            timelineEventCount: intel?.timelineEvents.length ?? 0,
            hasAlbumContext: Boolean(pkg.metadata.albumTitle),
            hasCover: Boolean(pkg.metadata.coverUrl),
            hasVideo: Boolean(pkg.metadata.hasVdjMedia || pkg.metadata.videoInfo),
            updatedAt: pkg.updatedAt ?? null,
            experienceReady: isSongExperienceRenderable(status),
          });
        } catch {
          // Ignore malformed package files.
        }
      }),
  );

  return out;
}
