import { inspectQuery } from "@/lib/inspect/pg";
import { normVdjPath, scanVdjDatabase, type VdjLibraryEntry } from "@/lib/ops/intelligence/vdj-database";

import { syntheticRvtrFromPath } from "./store";

export type CollectorPilotSong = {
  key: string;
  rvtr: string | null;
  artist: string;
  title: string;
  vdjFilePath?: string;
  performanceHints?: string[];
  notes?: string;
};

export const COLLECTOR_PILOT_SONGS: CollectorPilotSong[] = [
  {
    key: "phil-collins-air-tonight",
    rvtr: "RVTR417030",
    artist: "Phil Collins",
    title: "In The Air Tonight",
    performanceHints: ["paris", "finally tour", "london", "philadelphia"],
    notes: "Finally Tour / Paris version preferred if identifiable in VirtualDJ library.",
  },
  {
    key: "thomas-dolby-science",
    rvtr: "RVTR817112",
    artist: "Thomas Dolby",
    title: "She Blinded Me With Science",
  },
  {
    key: "mc-serch-medley",
    rvtr: null,
    artist: "MC Serch",
    title: "3rd Bass Medley",
    vdjFilePath: "/Users/bobhopp/DJ MEDIA/VIDEO/1990's/3rd Bass - Medley.mp4",
    notes: "VDJ-only pilot track — graph linkage pending.",
  },
];

export type ResolvedCollectorSong = {
  rvtr: string;
  artist: string;
  title: string;
  graphLinked: boolean;
  vdjFilePath: string | null;
  performanceHints: string[];
  notes: string[];
};

export async function resolveRvtrFromMediaPath(filePath: string): Promise<string | null> {
  try {
    const rows = await inspectQuery<{ rvtr: string }>(
      `
      SELECT upper(trim(coalesce(ctd.retroverse_track_id, ctd.track_id::text))) AS rvtr
      FROM media_track_links mtl
      JOIN media_assets ma ON ma.id = mtl.media_asset_id
      JOIN canonical_track_display ctd ON ctd.track_id::text = mtl.track_id::text
      WHERE lower(replace(ma.source_path, '\\', '/')) = lower(replace($1, '\\', '/'))
      LIMIT 1
      `,
      [filePath],
    );
    return rows[0]?.rvtr?.trim().toUpperCase() ?? null;
  } catch {
    return null;
  }
}

export async function resolveCollectorPilotSong(
  pilot: CollectorPilotSong,
): Promise<ResolvedCollectorSong> {
  const notes = pilot.notes ? [pilot.notes] : [];

  if (pilot.rvtr) {
    return {
      rvtr: pilot.rvtr.trim().toUpperCase(),
      artist: pilot.artist,
      title: pilot.title,
      graphLinked: true,
      vdjFilePath: pilot.vdjFilePath ?? null,
      performanceHints: pilot.performanceHints ?? [],
      notes,
    };
  }

  const filePath = pilot.vdjFilePath?.trim();
  if (!filePath) {
    throw new Error(`Pilot song ${pilot.key} has no RVTR and no VDJ path`);
  }

  const linked = await resolveRvtrFromMediaPath(filePath);
  if (linked) {
    return {
      rvtr: linked,
      artist: pilot.artist,
      title: pilot.title,
      graphLinked: true,
      vdjFilePath: filePath,
      performanceHints: pilot.performanceHints ?? [],
      notes,
    };
  }

  notes.push("Using VDJ-derived identity — not yet linked in Retroverse graph.");
  return {
    rvtr: syntheticRvtrFromPath(filePath),
    artist: pilot.artist,
    title: pilot.title,
    graphLinked: false,
    vdjFilePath: filePath,
    performanceHints: pilot.performanceHints ?? [],
    notes,
  };
}

function performanceLabelFromPath(filePath: string): string | null {
  const base = filePath.split("/").pop() ?? filePath;
  const paren = base.match(/\(([^)]+)\)/);
  if (paren?.[1]) return paren[1];
  if (/paris/i.test(base)) return "Paris";
  if (/london/i.test(base)) return "London";
  if (/philadelphia/i.test(base)) return "Philadelphia";
  if (/live/i.test(base)) return "Live";
  return null;
}

export function vdjEntryToMediaItem(entry: VdjLibraryEntry): import("./types").CollectorVdjMediaItem {
  return {
    filePath: entry.filePath,
    artist: entry.artist,
    title: entry.title,
    isVideo: entry.isVideo,
    playCount: entry.playCount,
    year: entry.year,
    genre: entry.genre || null,
    user2: entry.user2 || null,
    performanceLabel: performanceLabelFromPath(entry.filePath),
  };
}

export async function findVdjMediaForSong(input: {
  artist: string;
  title: string;
  preferredPath?: string | null;
  performanceHints?: string[];
}): Promise<import("./types").CollectorVdjMediaItem[]> {
  const scan = await scanVdjDatabase();
  const artistTokens = input.artist
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  const titleTokens = input.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  function artistMatches(entry: VdjLibraryEntry): boolean {
    const artist = entry.artist.toLowerCase();
    if (!artist.trim()) return false;
    if (artist.includes(input.artist.toLowerCase()) || input.artist.toLowerCase().includes(artist)) {
      return true;
    }
    return artistTokens.every((token) => artist.includes(token));
  }

  function titleMatches(entry: VdjLibraryEntry): boolean {
    const title = entry.title.toLowerCase();
    if (!title.trim()) return false;
    if (title.includes(input.title.toLowerCase()) || input.title.toLowerCase().includes(title)) {
      return true;
    }
    const overlap = titleTokens.filter((token) => title.includes(token)).length;
    return titleTokens.length > 0 && overlap >= Math.min(2, titleTokens.length);
  }

  const matches = scan.entries.filter((entry) => artistMatches(entry) && titleMatches(entry));

  const preferredNorm = input.preferredPath ? normVdjPath(input.preferredPath) : null;
  const ranked = [...matches].sort((a, b) => {
    if (preferredNorm) {
      const aPref = normVdjPath(a.filePath) === preferredNorm ? 1 : 0;
      const bPref = normVdjPath(b.filePath) === preferredNorm ? 1 : 0;
      if (aPref !== bPref) return bPref - aPref;
    }
    const hints = input.performanceHints ?? [];
    const score = (entry: VdjLibraryEntry) => {
      let s = entry.isVideo ? 2 : 0;
      const path = entry.filePath.toLowerCase();
      const title = entry.title.toLowerCase();
      for (const hint of hints) {
        if (path.includes(hint.toLowerCase()) || title.includes(hint.toLowerCase())) s += 5;
      }
      return s;
    };
    return score(b) - score(a);
  });

  return ranked.map(vdjEntryToMediaItem);
}

export function pickPreferredPerformance(
  items: import("./types").CollectorVdjMediaItem[],
  hints: string[],
): import("./types").CollectorVdjMediaItem | null {
  const videos = items.filter((item) => item.isVideo);
  if (videos.length === 0) return items[0] ?? null;

  for (const hint of hints) {
    const hit = videos.find(
      (item) =>
        item.filePath.toLowerCase().includes(hint.toLowerCase()) ||
        item.performanceLabel?.toLowerCase().includes(hint.toLowerCase()),
    );
    if (hit) return hit;
  }

  return videos[0] ?? null;
}

export async function findVdjEntryByPath(
  filePath: string,
): Promise<import("./types").CollectorVdjMediaItem | null> {
  const scan = await scanVdjDatabase();
  const target = normVdjPath(filePath);
  const entry = scan.entries.find((item) => normVdjPath(item.filePath) === target);
  return entry ? vdjEntryToMediaItem(entry) : null;
}
