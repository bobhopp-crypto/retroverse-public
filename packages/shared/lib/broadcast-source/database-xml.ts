import "server-only";

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";

import { bundledSongPackagePath } from "@/lib/ops/intelligence/paths";
import { scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";
import {
  newPresentationItem,
  type PresentationItem,
  type PresentationQueue,
} from "@/lib/bobos/presentation/types";
import { isOpsPlayableVideoPath } from "@/lib/ops/ops-video-media";

import type { BroadcastSourceConfig } from "./types";

const MIN_PLAY_COUNT = 5;
const RVTR_LABEL_RE = /RVTR\d{6}/i;

/** Stable 16-hex-char key for a VDJ entry — derived from its normalized filepath. */
export function vdjFileKey(filePathNorm: string): string {
  return createHash("sha256").update(filePathNorm).digest("hex").slice(0, 16);
}

/** Build the link id used in PresentationItemLink.id. */
function linkId(rvtr: string | null, key: string): string {
  if (rvtr) {
    const has = existsSync(bundledSongPackagePath(rvtr));
    if (has) return rvtr;
  }
  return `vdj:${key}`;
}

function rvtrFromLabel(label: string): string | null {
  const m = label.match(RVTR_LABEL_RE);
  return m?.[0]?.toUpperCase() ?? null;
}

/**
 * Build a `PresentationQueue` from VirtualDJ's database.xml.
 *
 * Filters:
 *   - VIDEO files only (isOpsPlayableVideoPath)
 *   - PlayCount >= 5
 *   - Valid Artist + Title metadata
 *   - Deduplicates by normalised Artist+Title
 *
 * Sort: descending play count, then Artist+Title alphabetical.
 */
export async function buildDatabaseXmlBroadcastQueue(
  config: BroadcastSourceConfig,
): Promise<PresentationQueue> {
  const scan = await scanVdjDatabase();

  const seen = new Set<string>();
  const items: PresentationItem[] = [];

  const eligible = scan.entries
    .filter((e) => {
      if (!isOpsPlayableVideoPath(e.filePath)) return false;
      if ((e.playCount ?? 0) < MIN_PLAY_COUNT) return false;
      if (!e.artist.trim() || !e.title.trim()) return false;
      return true;
    })
    .sort((a, b) => {
      const pa = a.playCount ?? 0;
      const pb = b.playCount ?? 0;
      if (pb !== pa) return pb - pa;
      const ka = `${a.artist.toLowerCase()}|${a.title.toLowerCase()}`;
      const kb = `${b.artist.toLowerCase()}|${b.title.toLowerCase()}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

  for (const entry of eligible) {
    const dedupeKey = `${entry.artist.trim().toLowerCase()}|||${entry.title.trim().toLowerCase()}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const rvtrRaw = rvtrFromLabel(entry.label);
    const key = vdjFileKey(entry.filePathNorm);
    const id = linkId(rvtrRaw, key);

    const item = newPresentationItem("song");
    item.title = entry.title.trim();
    item.subtitle = entry.artist.trim();
    item.durationSeconds = config.songDurationSeconds;
    item.transition = "fade";
    item.link = {
      kind: "song",
      id,
      label: entry.title.trim(),
    };

    items.push(item);
  }

  return { items, loop: true };
}
