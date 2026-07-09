/**
 * RVBA — RetroVerse Broadcast Asset.
 *
 * An RVBA is not a web page. It is the one presentation asset a renderer
 * ever needs: title, subtitle, body, and enough metadata to lay it out.
 * Every audience/preview surface renders from an Rvba — never from a
 * VirtualDJ track, a queue item, or a presentation-specific shape.
 *
 * Isomorphic (no server-only imports) so the same adapter runs in the
 * Broadcast Engine (server) and in Studio's live-draft preview (client).
 */

import type {
  PresentationItem,
  PresentationItemLink,
  PresentationTransition,
} from "@/lib/bobos/presentation/types";

export const RVBA_TYPES = [
  "now-playing",
  "story",
  "artist",
  "album",
  "charts",
  "related",
  "announcement",
  "giveaway",
  "image",
  "pdf",
  "video",
  "countdown",
  "blank",
] as const;

export type RvbaType = (typeof RVBA_TYPES)[number];

export const RVBA_TYPE_LABELS: Record<RvbaType, string> = {
  "now-playing": "Now Playing",
  story: "Story",
  artist: "Artist Spotlight",
  album: "Album",
  charts: "Charts",
  related: "Related",
  announcement: "Announcement",
  giveaway: "Giveaway",
  image: "Image",
  pdf: "PDF",
  video: "Video",
  countdown: "Starting In",
  blank: "",
};

/** The one shape every renderer consumes. Additional optional fields can be
 * appended later (e.g. for image/pdf/video content) without breaking readers. */
export type Rvba = {
  id: string;
  type: RvbaType;
  title: string;
  subtitle: string;
  body: string;
  transition: PresentationTransition;
  countdownTarget: string | null;
  link: PresentationItemLink | null;
  /** Forward-compat for image/pdf/video RVBAs. Always null until those
   * content pipelines exist — no rendering depends on it yet. */
  mediaUrl: string | null;
};

/** Legacy PresentationItemType -> RvbaType. The only place old queue-authoring
 * vocabulary is translated to the new contract; authoring itself is untouched. */
const LEGACY_TYPE_TO_RVBA: Record<PresentationItem["type"], RvbaType> = {
  slide: "announcement",
  artist: "artist",
  song: "now-playing",
  announcement: "announcement",
  registration: "announcement",
  countdown: "countdown",
  "coming-soon": "announcement",
  "current-event": "announcement",
  placeholder: "blank",
};

/** Adapter: resolved PresentationItem (from a queue or the VDJ override) -> Rvba. */
export function resolveRvbaFromPresentationItem(item: PresentationItem): Rvba {
  return {
    id: item.id,
    type: LEGACY_TYPE_TO_RVBA[item.type],
    title: item.title,
    subtitle: item.subtitle,
    body: item.body,
    transition: item.transition,
    countdownTarget: item.countdownTarget,
    link: item.link,
    mediaUrl: null,
  };
}

import type { CurrentBroadcast } from "./current-broadcast";
import { resolveBroadcastAsset } from "./resolve-broadcast-asset";

/**
 * The canonical RVTR to load a song package for, if any.
 * Prefer `resolveBroadcastAsset()` — this is a thin compatibility helper.
 */
export function rvtrFromNowPlayingRvba(
  rvba: Rvba,
  broadcast?: CurrentBroadcast | null,
): string | null {
  return resolveBroadcastAsset(rvba, broadcast).packageRvtr;
}
