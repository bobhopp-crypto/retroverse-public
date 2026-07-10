/**
 * Broadcast asset resolver — isomorphic (no server-only imports).
 *
 * Maps the current playhead RVBA + CurrentBroadcast metadata to the
 * experience the audience renderer should mount. PresentationStage uses this
 * to route now-playing tracks to the Standard Broadcast Asset Composer.
 */

import type { CurrentBroadcast } from "./current-broadcast";
import type { Rvba, RvbaType } from "./rvba";

export type BroadcastAssetKind =
  | "track"
  | "album"
  | "artist"
  | "week"
  | "year"
  | "event"
  | "broadcast"
  | "vdj-live";

/** What PresentationStage should mount for this asset. */
export type BroadcastAssetExperience = "broadcast-asset" | "broadcast-stage" | "off-air";

export type ResolvedBroadcastAsset = {
  kind: BroadcastAssetKind;
  assetId: string | null;
  experience: BroadcastAssetExperience;
  /** When experience is broadcast-asset, the RVTR passed to now-playing-package. */
  packageRvtr: string | null;
};

const RVTR_RE = /^RVTR\d{6}$/i;
const RVAL_RE = /^RVAL\d{6}$/i;
const RVAR_RE = /^RVAR\d{6}$/i;
const RVWK_RE = /^RVWK/i;
const RVYR_RE = /^RVYR/i;
const RVEV_RE = /^RVEV/i;
const RVBA_RE = /^RVBA/i;
const VDJ_RE = /^VDJ/i;

/** Parse a canonical Retroverse asset id string (RVTR, RVAL, RVBA, VDJ, …). */
export function parseCanonicalAssetId(raw: string): { kind: BroadcastAssetKind; assetId: string } | null {
  const id = raw.trim();
  if (!id) return null;
  if (RVTR_RE.test(id)) return { kind: "track", assetId: id.toUpperCase() };
  if (RVAL_RE.test(id)) return { kind: "album", assetId: id.toUpperCase() };
  if (RVAR_RE.test(id)) return { kind: "artist", assetId: id.toUpperCase() };
  if (RVWK_RE.test(id)) return { kind: "week", assetId: id.toUpperCase() };
  if (RVYR_RE.test(id)) return { kind: "year", assetId: id.toUpperCase() };
  if (RVEV_RE.test(id)) return { kind: "event", assetId: id.toUpperCase() };
  if (RVBA_RE.test(id)) return { kind: "broadcast", assetId: id.toUpperCase() };
  if (VDJ_RE.test(id)) return { kind: "vdj-live", assetId: id.toUpperCase() };
  return null;
}

function rvbaTypeToKind(type: RvbaType): BroadcastAssetKind {
  switch (type) {
    case "now-playing":
      return "track";
    case "artist":
      return "artist";
    case "album":
      return "album";
    default:
      return "broadcast";
  }
}

function canonicalFromRvba(rvba: Rvba): { kind: BroadcastAssetKind; assetId: string } | null {
  if (rvba.link?.id) {
    const fromLink = parseCanonicalAssetId(rvba.link.id);
    if (fromLink) return fromLink;
  }
  return parseCanonicalAssetId(rvba.id);
}

function packageRvtrFromRvba(rvba: Rvba): string | null {
  const canonical = canonicalFromRvba(rvba);
  if (canonical?.kind === "track") return canonical.assetId;
  if (rvba.link?.kind === "song") {
    const id = rvba.link.id.trim();
    if (RVTR_RE.test(id)) return id.toUpperCase();
  }
  return null;
}

/**
 * Resolve what the audience renderer should show.
 *
 * `broadcast.type` from the playhead engine is authoritative: anything that is
 * not `now-playing` uses the broadcast stage (announcements, countdowns, …)
 * and never mounts the song UniversalRenderer — even if a previous RVTR
 * package is still in client state or VirtualDJ is playing underneath.
 */
export function resolveBroadcastAsset(
  rvba: Rvba | null,
  broadcast?: CurrentBroadcast | null,
): ResolvedBroadcastAsset {
  if (!rvba || broadcast?.state === "off-air") {
    return { kind: "broadcast", assetId: null, experience: "off-air", packageRvtr: null };
  }

  const canonical = canonicalFromRvba(rvba);
  const kind = canonical?.kind ?? rvbaTypeToKind(rvba.type);

  if (broadcast && broadcast.type !== "now-playing") {
    return {
      kind,
      assetId: canonical?.assetId ?? null,
      experience: "broadcast-stage",
      packageRvtr: null,
    };
  }

  const packageRvtr = packageRvtrFromRvba(rvba);
  const hasSongMeta = Boolean(rvba.title.trim() && rvba.subtitle.trim());

  if (packageRvtr || (rvba.type === "now-playing" && hasSongMeta)) {
    return {
      kind: packageRvtr ? "track" : (canonical?.kind ?? "vdj-live"),
      assetId: packageRvtr ?? canonical?.assetId ?? rvba.id,
      experience: "broadcast-asset",
      packageRvtr,
    };
  }

  return {
    kind,
    assetId: canonical?.assetId ?? null,
    experience: "broadcast-stage",
    packageRvtr: null,
  };
}
