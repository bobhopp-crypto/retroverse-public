import type { TemplateId, TemplateSelectionMode } from "./types";

/** Stable pseudo-random template for a song — avoids flicker across playhead polls. */
function hashRvtr(rvtr: string): number {
  const normalized = rvtr.trim().toUpperCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Select a Theme Pack 1 template.
 *
 * `default` — pseudo-random 1–12 derived from RVTR (stable per song).
 * Other modes are stubbed for future artist/holiday/event routing.
 */
export function selectTemplateId(
  rvtr: string,
  mode: TemplateSelectionMode = "default",
): TemplateId {
  switch (mode) {
    case "fixed":
    case "artist":
    case "holiday":
    case "event":
      // Stub — v1 always uses default selection until preference tables exist.
      break;
    case "default":
    default:
      break;
  }

  const bucket = (hashRvtr(rvtr) % 12) + 1;
  return bucket as TemplateId;
}
