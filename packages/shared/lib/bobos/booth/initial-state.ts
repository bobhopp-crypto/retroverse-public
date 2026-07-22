import type { BoothState } from "./types";

/** Enter Booth → READY (journey 5.1). No Program loaded until Load Show. */
export function createInitialBoothState(): BoothState {
  return {
    primary: "READY",
    currentSource: null,
    armedSource: null,
    returnTarget: null,
    auto: false,
    hold: false,
    override: false,
    showActive: false,
    programLoaded: false,
    presentationId: null,
    showName: null,
    currentAsset: null,
    nextAsset: null,
    upcoming: null,
    paused: false,
    localConfidence: "—",
    publicConfidence: "—",
    statusMessage: "—",
    showLog: [],
    lastPublishedKey: null,
  };
}

/** Interrupt Sources still use Booth placeholders until those Sources have real packages. */
export const PLACEHOLDER_INTERRUPT_ASSETS: Record<
  "VirtualDJ" | "Announcement" | "Giveaway" | "Emergency",
  { id: string; title: string }
> = {
  VirtualDJ: { id: "VDJ-PLACEHOLDER", title: "VirtualDJ Now Playing" },
  Announcement: { id: "ANN-PLACEHOLDER", title: "Announcement Card" },
  Giveaway: { id: "GIV-PLACEHOLDER", title: "Giveaway Moment" },
  Emergency: { id: "EMG-PLACEHOLDER", title: "Emergency Card" },
};
