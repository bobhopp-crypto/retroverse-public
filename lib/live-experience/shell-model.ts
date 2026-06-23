import { slugFromArtistName } from "@/lib/artist/slug";
import { loadDeckIndex } from "@/lib/ops/intelligence/deck-index";
import { loadSongPackageIndex, normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
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

function actionSet(rvtr: string | null, artist: string, hasPackage: boolean, hasDeck: boolean): LiveExperienceAction[] {
  return [
    { label: "Story", href: rvtr && hasPackage ? `/rvtr/${rvtr}/song-sheet` : null },
    { label: "Deck", href: rvtr && hasDeck ? `/rvtr/${rvtr}/deck` : null },
    { label: "Chart", href: rvtr ? trackPageHref(rvtr) : null },
    { label: "Artist", href: artist.trim() ? `/artist/${slugFromArtistName(artist)}` : null },
    { label: "Live", href: "/live" },
  ];
}

function statusFor(rvtr: string | null, hasPackage: boolean, hasDeck: boolean): LiveExperienceStatus {
  if (hasDeck && hasPackage) return "Deck";
  if (hasPackage) return "Package";
  if (rvtr) return "Track";
  return "Fallback";
}

function primaryFor(status: LiveExperienceStatus, rvtr: string | null): { href: string | null; label: string } {
  if (!rvtr) return { href: null, label: "Now Playing" };
  if (status === "Deck") return { href: `/rvtr/${rvtr}/deck`, label: "Open Deck" };
  if (status === "Package") return { href: `/rvtr/${rvtr}/song-sheet`, label: "Open Story" };
  return { href: trackPageHref(rvtr), label: "Open Chart" };
}

async function availability(rvtr: string | null): Promise<{ hasPackage: boolean; hasDeck: boolean }> {
  const normalized = rvtr ? normalizePackageRvtr(rvtr) : null;
  if (!normalized) return { hasPackage: false, hasDeck: false };

  const [packageIndex, deckIndex] = await Promise.all([loadSongPackageIndex(), loadDeckIndex()]);
  return {
    hasPackage: packageIndex.packages.some((entry) => normalizePackageRvtr(entry.rvtr) === normalized),
    hasDeck: deckIndex.decks.some((entry) => normalizePackageRvtr(entry.rvtr) === normalized),
  };
}

export async function buildLiveExperienceShellModel(input: {
  rvtr: string | null;
  title: string;
  artist: string;
  year: number | null;
  peakHot100?: number | null;
  activeTab: LiveExperienceTab;
}): Promise<LiveExperienceShellModel> {
  const rvtr = input.rvtr ? normalizePackageRvtr(input.rvtr) : null;
  const { hasPackage, hasDeck } = await availability(rvtr);
  const status = statusFor(rvtr, hasPackage, hasDeck);
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
    actions: actionSet(rvtr, input.artist, hasPackage, hasDeck),
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
    year: live?.year ?? null,
    peakHot100: null,
    activeTab,
  });
}
