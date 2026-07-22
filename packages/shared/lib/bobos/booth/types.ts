/**
 * The Booth — Version 1 state model.
 * Authority: docs/broadcast/THE_BOOTH_V1_FUNCTIONAL_SPECIFICATION.md
 *
 * Program index / ordering: PresentationQueue + Playhead (not Booth Store).
 */

export const BOOTH_PRIMARIES = [
  "OFF",
  "READY",
  "PROGRAM",
  "VIRTUALDJ",
  "ANNOUNCEMENT",
  "GIVEAWAY",
  "EMERGENCY",
] as const;

export type BoothPrimary = (typeof BOOTH_PRIMARIES)[number];

/** Sources that can own The Air (V1). */
export const BOOTH_SOURCES = [
  "Program",
  "VirtualDJ",
  "Announcement",
  "Giveaway",
  "Emergency",
] as const;

export type BoothSource = (typeof BOOTH_SOURCES)[number];

/** Faceplate pad ids → Source. */
export const BOOTH_SOURCE_PADS = ["PROGRAM", "VDJ", "ANNOUNCE", "GIVEAWAY", "EMERGENCY"] as const;
export type BoothSourcePad = (typeof BOOTH_SOURCE_PADS)[number];

export const PAD_TO_SOURCE: Record<BoothSourcePad, BoothSource> = {
  PROGRAM: "Program",
  VDJ: "VirtualDJ",
  ANNOUNCE: "Announcement",
  GIVEAWAY: "Giveaway",
  EMERGENCY: "Emergency",
};

export const SOURCE_TO_PRIMARY: Record<BoothSource, BoothPrimary> = {
  Program: "PROGRAM",
  VirtualDJ: "VIRTUALDJ",
  Announcement: "ANNOUNCEMENT",
  Giveaway: "GIVEAWAY",
  Emergency: "EMERGENCY",
};

export const PRIMARY_TO_SOURCE: Record<BoothPrimary, BoothSource | null> = {
  OFF: null,
  READY: null,
  PROGRAM: "Program",
  VIRTUALDJ: "VirtualDJ",
  ANNOUNCEMENT: "Announcement",
  GIVEAWAY: "Giveaway",
  EMERGENCY: "Emergency",
};

/** Mirror of a PresentationItem / RVBA — id is the authoritative queue item id. */
export type BoothAsset = {
  id: string;
  title: string;
};

export type BoothConfidence = "—" | "Confirmed" | "Unconfirmed" | "Fault";

export type BoothControl = "Operator" | "Automatic" | "—";

export type BoothShowLogEntry = {
  clock: string;
  action: string;
  source: string;
  asset: string;
  result: string;
};

export type BoothState = {
  primary: BoothPrimary;
  currentSource: BoothSource | null;
  armedSource: BoothSource | null;
  returnTarget: BoothAsset | null;
  auto: boolean;
  hold: boolean;
  override: boolean;
  showActive: boolean;
  programLoaded: boolean;
  /** Authoritative presentation id for the loaded Program. */
  presentationId: string | null;
  showName: string | null;
  /** Display mirrors — Program position lives in Presentation playhead. */
  currentAsset: BoothAsset | null;
  nextAsset: BoothAsset | null;
  upcoming: string | null;
  paused: boolean;
  localConfidence: BoothConfidence;
  publicConfidence: BoothConfidence;
  statusMessage: string;
  showLog: BoothShowLogEntry[];
  /** Last published air key (testing / duplicate detection). */
  lastPublishedKey: string | null;
};

export type BoothProgramLoadPayload = {
  presentationId: string;
  showName: string;
  currentAsset: BoothAsset;
  nextAsset: BoothAsset | null;
  upcoming: string | null;
};

export type BoothProgramViewPayload = {
  presentationId: string;
  showName: string;
  currentAsset: BoothAsset | null;
  nextAsset: BoothAsset | null;
  upcoming: string | null;
  paused: boolean;
  /** When interrupt owns air, Program return position. */
  returnTarget?: BoothAsset | null;
  currentAvailable: boolean;
};

export type BoothAction =
  | { type: "TAKE"; source: BoothSource | null }
  | { type: "RETURN" }
  | { type: "GO_LIVE" }
  | { type: "SET_AUTO"; armed: boolean }
  | { type: "SET_HOLD" }
  | { type: "CLEAR_HOLD" }
  | { type: "EMERGENCY_STOP" }
  | { type: "END_SHOW" }
  | { type: "ARM_SOURCE"; source: BoothSource }
  /** Client requests load — server applies APPLY_PROGRAM_LOAD. */
  | { type: "LOAD_SHOW" }
  | { type: "LOAD_SHOW_FAILED"; error: string }
  | { type: "APPLY_PROGRAM_LOAD"; payload: BoothProgramLoadPayload }
  | { type: "APPLY_PROGRAM_VIEW"; payload: BoothProgramViewPayload; statusMessage?: string }
  | { type: "PREVIOUS" }
  | { type: "NEXT" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "PREVIEW" }
  | { type: "JUMP"; itemId: string }
  | { type: "OPEN_RUNTIME" }
  | {
      type: "APPLY_PUBLISH_RESULT";
      localConfidence: BoothConfidence;
      publicConfidence: BoothConfidence;
      statusMessage: string;
      publishedKey?: string | null;
    };

export function isOnAirPrimary(primary: BoothPrimary): boolean {
  return primary !== "OFF" && primary !== "READY";
}

export function controlFromState(state: BoothState): BoothControl {
  if (!isOnAirPrimary(state.primary)) return "—";
  if (state.override) return "Operator";
  if (state.auto) return "Automatic";
  return "Operator";
}

export function returnReady(state: BoothState): boolean {
  return (
    state.primary === "VIRTUALDJ" ||
    state.primary === "ANNOUNCEMENT" ||
    state.primary === "GIVEAWAY" ||
    state.primary === "EMERGENCY"
  );
}
