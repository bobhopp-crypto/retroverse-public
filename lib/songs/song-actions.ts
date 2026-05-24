import { trackPageHref } from "@/lib/search/entity-routes";

export type SongActionTarget = {
  title: string;
  artist: string;
  rvtr?: string | null;
  href?: string | null;
};

const RE_RVTR = /^RVTR\d{6}$/i;

export function rvtrFromToken(token: string | null | undefined): string | null {
  if (!token?.trim()) return null;
  const match = token.trim().match(/RVTR\d{6}/i)?.[0];
  return match ? match.toUpperCase() : null;
}

export function songPageHrefForTarget(target: SongActionTarget): string | null {
  const fromRvtr = rvtrFromToken(target.rvtr);
  if (fromRvtr) return trackPageHref(fromRvtr);
  if (target.href?.trim() && target.href.startsWith("/track/")) return target.href.split("?")[0] ?? target.href;
  const fromId = rvtrFromToken(target.title);
  if (fromId) return trackPageHref(fromId);
  if (target.title.trim()) return trackPageHref(target.title);
  return null;
}

/** Curate / inspect — existing graph inspector workflow. */
export function songInspectHref(target: SongActionTarget): string {
  const rvtr = rvtrFromToken(target.rvtr);
  if (rvtr) return `/inspect?q=${encodeURIComponent(rvtr)}`;
  const label = [target.artist, target.title].filter(Boolean).join(" ").trim();
  return `/inspect?q=${encodeURIComponent(label || target.title || "song")}`;
}

export function songActionTargetFromParts(parts: {
  title: string;
  artist: string;
  rvtr?: string | null;
  id?: string | null;
  href?: string | null;
}): SongActionTarget {
  return {
    title: parts.title,
    artist: parts.artist,
    rvtr: parts.rvtr ?? rvtrFromToken(parts.id ?? null),
    href: parts.href ?? null,
  };
}
