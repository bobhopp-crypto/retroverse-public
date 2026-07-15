import type { LiveControlState } from "@/lib/live-control/types";
import type { ChannelZeroExperience } from "@/lib/channel-zero/types";
import { isLiveChannelSessionActive } from "@/lib/live-control/engine";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { loadTrackPage, type TrackPageData } from "@/lib/track/load-track-page";
import {
  loadSongPackageIndex,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import { isSongExperienceRenderable } from "@/lib/ops/intelligence/song-experience-renderability";

import { normalizeLiveTrackId } from "./resolve-live-track";
import { currentLiveSelection } from "./live-freshness";
import type { SundayNightsLiveSelection, SundayNightsState } from "./types";

export type LiveDestinationKind = "EXPERIENCE" | "PACKAGE" | "TRACK";

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
  publicState?: {
    version: 2;
    source: "virtualdj" | "recommendation" | "channel-zero";
    servedAt: string;
  };
  /** Channel Zero resolver output — operator-visible decision metadata. */
  channelZero?: ChannelZeroExperience;
};

function logDestination(rvtr: string | null, destination: LiveDestination) {
  console.info("[live-now-playing] destination_selected", {
    rvtr,
    destination: destination.kind,
    href: destination.href,
  });
}

export async function resolveLiveDestination(
  trackIdParam: string | null,
): Promise<LiveDestination> {
  const trackId = normalizeLiveTrackId(trackIdParam);
  if (!trackId) {
    const destination = { kind: "TRACK", href: null } satisfies LiveDestination;
    logDestination(null, destination);
    return destination;
  }

  if (trackId.startsWith("vdj:")) {
    const destination = {
      kind: "EXPERIENCE",
      href: `/song/vdj/${trackId.slice(4)}`,
    } satisfies LiveDestination;
    logDestination(trackId, destination);
    return destination;
  }

  const rvtr = normalizePackageRvtr(trackId);
  if (!rvtr) {
    const destination = { kind: "TRACK", href: null } satisfies LiveDestination;
    logDestination(null, destination);
    return destination;
  }

  const experienceHref = liveSongExperienceHref(rvtr);
  const destination = { kind: "EXPERIENCE", href: experienceHref } satisfies LiveDestination;

  logDestination(rvtr, destination);
  return destination;
}

export async function buildSundayNightsCurrentPayload(
  state: SundayNightsState,
  control?: LiveControlState | null,
): Promise<SundayNightsCurrentPayload> {
  const channelActive = control ? isLiveChannelSessionActive(control) : false;
  const freshLive = currentLiveSelection(state);
  const bridgeState =
    !freshLive || freshLive.source === "manual"
      ? { ...state, currentTrackId: null, live: null }
      : freshLive.source === "channel" && !channelActive
        ? { ...state, currentTrackId: null, live: null }
        : { ...state, currentTrackId: freshLive.rvtr, live: freshLive };
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
          running: channelActive,
          mode: control.mode,
          durationSeconds: control.durationSeconds,
          nextAdvanceAt: control.nextAdvanceAt,
        }
      : null,
  };
}

/** Whether the RVTR has a patron-renderable Song Experience (package published or in review). */
export async function hasSongExperience(rvtrParam: string): Promise<boolean> {
  const rvtr = normalizePackageRvtr(rvtrParam);
  if (!rvtr) return false;
  const packageIndex = await loadSongPackageIndex();
  const entry = packageIndex.packages.find((pkg) => normalizePackageRvtr(pkg.rvtr) === rvtr);
  return Boolean(entry && isSongExperienceRenderable(entry.status));
}
