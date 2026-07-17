import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import {
  loadSongPackage,
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";
import { trackPageHref } from "@/lib/search/entity-routes";
import type {
  LiveExperienceAction,
  LiveExperienceIdentity,
  LiveExperienceStatus,
  LiveExperienceTab,
} from "@/components/live-experience/LiveExperienceShell";
import type { SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { TrackPageData } from "@/lib/track/load-track-page";

export type LiveExperienceShellModel = {
  identity: LiveExperienceIdentity;
  status: LiveExperienceStatus;
  activeTab: LiveExperienceTab;
  actions: LiveExperienceAction[];
  primaryHref: string | null;
  primaryLabel: string;
};

function actionSet(
  rvtr: string | null,
  artistId: number | null,
  hasPackage: boolean,
  experienceReady: boolean,
): LiveExperienceAction[] {
  const experienceHref = rvtr && experienceReady ? liveSongExperienceHref(rvtr) : null;
  return [
    { label: "Story", href: rvtr && hasPackage ? `/rvtr/${rvtr}/song-sheet` : null },
    { label: "Song", href: experienceHref },
    { label: "Chart", href: rvtr ? trackPageHref(rvtr) : null },
    { label: "Artist", href: artistId != null && artistId > 0 ? `/artist/${artistId}` : null },
    { label: "Live", href: "/live" },
  ];
}

function statusFor(
  rvtr: string | null,
  hasPackage: boolean,
  experienceReady: boolean,
): LiveExperienceStatus {
  if (experienceReady && hasPackage) return "Experience";
  if (hasPackage) return "Package";
  if (rvtr) return "Track";
  return "Fallback";
}

function primaryFor(status: LiveExperienceStatus, rvtr: string | null): { href: string | null; label: string } {
  if (!rvtr) return { href: null, label: "Now Playing" };
  if (status === "Experience") return { href: liveSongExperienceHref(rvtr), label: "Open Song Experience" };
  if (status === "Package") return { href: `/rvtr/${rvtr}/song-sheet`, label: "Open Story" };
  return { href: trackPageHref(rvtr), label: "Open Chart" };
}

async function availability(rvtr: string | null): Promise<{ hasPackage: boolean; experienceReady: boolean }> {
  const normalized = rvtr ? normalizePackageRvtr(rvtr) : null;
  if (!normalized) return { hasPackage: false, experienceReady: false };

  const [packageIndex, pkg] = await Promise.all([
    loadSongPackageIndex(),
    loadSongPackage(normalized).catch(() => null),
  ]);
  return {
    hasPackage: packageIndex.packages.some((entry) => normalizePackageRvtr(entry.rvtr) === normalized),
    experienceReady: Boolean(pkg && isSongExperienceRenderable(pkg.status)),
  };
}

export async function buildLiveExperienceShellModel(input: {
  rvtr: string | null;
  title: string;
  artist: string;
  artistId?: number | null;
  year: number | null;
  peakHot100?: number | null;
  activeTab: LiveExperienceTab;
}): Promise<LiveExperienceShellModel> {
  const rvtr = input.rvtr ? normalizePackageRvtr(input.rvtr) : null;
  const { hasPackage, experienceReady } = await availability(rvtr);
  const status = statusFor(rvtr, hasPackage, experienceReady);
  const primary = primaryFor(status, rvtr);

  return {
    identity: {
      rvtr,
      title: input.title,
      artist: input.artist,
      year: input.year,
      peakHot100: input.peakHot100 ?? null,
    },
    status,
    activeTab: input.activeTab,
    actions: actionSet(rvtr, input.artistId ?? null, hasPackage, experienceReady),
    primaryHref: primary.href,
    primaryLabel: primary.label,
  };
}

export async function buildLiveShellFromCurrent(
  current: SundayNightsCurrentPayload,
  activeTab: LiveExperienceTab,
): Promise<LiveExperienceShellModel> {
  const track: TrackPageData | null = current.track;
  if (track) {
    return buildLiveExperienceShellModel({
      rvtr: track.rvtr,
      title: track.title,
      artist: track.artistName,
      artistId: track.artistId,
      year: track.releaseYear,
      peakHot100: track.peakHot100,
      activeTab,
    });
  }

  const live = current.live;
  return buildLiveExperienceShellModel({
    rvtr: live?.rvtr ?? null,
    title: live?.title ?? "Waiting for the next song",
    artist: live?.artist ?? "Retroverse Live",
    artistId: null,
    year: live?.year ?? null,
    peakHot100: null,
    activeTab,
  });
}
