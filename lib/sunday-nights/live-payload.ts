import type { LiveControlState } from "@/lib/live-control/types";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import { loadDeckIndex } from "@/lib/ops/intelligence/deck-index";
import {
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";

import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

export type LiveDestinationKind = "EXPERIENCE" | "DECK" | "PACKAGE" | "TRACK";

export type LiveDestination = {
  kind: LiveDestinationKind;
  href: string | null;
};

export type SundayNightsCurrentPayload = {
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
  track: TrackPageData | null;
  destination: LiveDestination;
  channel: {
    running: boolean;
    mode: LiveControlState["mode"];
    durationSeconds: number;
    nextAdvanceAt: string | null;
  } | null;
};

function logDestination(rvtr: string | null, destination: LiveDestination) {
  console.info("[live-now-playing] destination_selected", {
    rvtr,
    destination: destination.kind,
    href: destination.href,
  });
}

export async function resolveLiveDestination(
  rvtrParam: string | null,
): Promise<LiveDestination> {
  const rvtr = rvtrParam ? normalizePackageRvtr(rvtrParam) : null;
  if (!rvtr) {
    const destination = { kind: "TRACK", href: null } satisfies LiveDestination;
    logDestination(null, destination);
    return destination;
  }

  const [packageIndex, deckIndex] = await Promise.all([
    loadSongPackageIndex(),
    loadDeckIndex(),
  ]);
  const pkg = packageIndex.packages.find((entry) => normalizePackageRvtr(entry.rvtr) === rvtr) ?? null;
  const hasDeck = deckIndex.decks.some((entry) => normalizePackageRvtr(entry.rvtr) === rvtr);

  const experienceHref = liveSongExperienceHref(rvtr);
  const destination =
    hasDeck && pkg
      ? ({ kind: "EXPERIENCE", href: experienceHref } satisfies LiveDestination)
      : pkg
        ? ({ kind: "EXPERIENCE", href: experienceHref } satisfies LiveDestination)
        : ({ kind: "EXPERIENCE", href: experienceHref } satisfies LiveDestination);

  logDestination(rvtr, destination);
  return destination;
}

export async function buildSundayNightsCurrentPayload(
  state: SundayNightsState,
  control?: LiveControlState | null,
): Promise<SundayNightsCurrentPayload> {
  const bridgeState =
    state.live?.source === "manual"
      ? { ...state, currentTrackId: null, live: null }
      : state;
  const track = bridgeState.currentTrackId
    ? await loadTrackPage(bridgeState.currentTrackId)
    : null;
  const destination = await resolveLiveDestination(bridgeState.currentTrackId);

  return {
    currentTrackId: bridgeState.currentTrackId,
    live: bridgeState.live,
    updatedAt: bridgeState.updatedAt,
    track,
    destination,
    channel: control
      ? {
          running: control.running,
          mode: control.mode,
          durationSeconds: control.durationSeconds,
          nextAdvanceAt: control.nextAdvanceAt,
        }
      : null,
  };
}
