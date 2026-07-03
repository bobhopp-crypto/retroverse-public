import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadVdjFolderFile } from "@/lib/ops/show-builder/parse-vdjfolder";

import { loadSundayAssetLibrary } from "../load-assets";
import { SUNDAY_EVENT_YEARS } from "../playlist-types";
import { loadRvtrAliasStore } from "../rvtr-aliases";
import { resolveRvtrForSongs } from "../resolve-rvtr";
import type { SundayPlaylistSnapshot } from "../snapshot-types";
import { useSundayNightsSnapshots } from "../storage-mode";

const SNAPSHOT_DIR = join(process.cwd(), "data", "sunday-nights", "snapshots");

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

export type SundayRefreshReport = {
  refreshedAt: string;
  mode: "local" | "production";
  snapshotsWritten: boolean;
  songsByYear: Record<string, number>;
  assets: number;
  rvtrMatched: number;
  noRvtr: number;
  aliases: number;
  validation: "PASS" | "FAIL";
  validationDetails: string[];
  notes: string[];
};

async function exportYear(year: number): Promise<SundayPlaylistSnapshot> {
  const pool = await loadVdjFolderFile(String(year), year);
  const rvtrByPath = await resolveRvtrForSongs(
    pool.map((s) => ({ path: s.path, artist: s.artist, title: s.title })),
  );

  const songs = pool.map((song) => ({
    key: song.key,
    artist: song.artist,
    title: song.title,
    year,
    rvtr: rvtrByPath.get(normPath(song.path)) ?? null,
    sourceList: `${year}.vdjfolder`,
    path: song.path,
    remix: song.remix,
  }));

  return {
    version: 1,
    year,
    exportedAt: new Date().toISOString(),
    source: `${year}.vdjfolder`,
    songs,
  };
}

async function writeSnapshots(): Promise<Record<string, number>> {
  await mkdir(SNAPSHOT_DIR, { recursive: true });
  const songsByYear: Record<string, number> = {};

  for (const year of SUNDAY_EVENT_YEARS) {
    const snap = await exportYear(year);
    await writeFile(
      join(SNAPSHOT_DIR, `${year}.json`),
      `${JSON.stringify(snap, null, 2)}\n`,
      "utf8",
    );
    songsByYear[String(year)] = snap.songs.length;
  }

  return songsByYear;
}

async function countFromExistingSnapshots(): Promise<{
  songsByYear: Record<string, number>;
  rvtrMatched: number;
  noRvtr: number;
}> {
  const songsByYear: Record<string, number> = {};
  let rvtrMatched = 0;
  let noRvtr = 0;

  for (const year of SUNDAY_EVENT_YEARS) {
    try {
      const { readFile } = await import("fs/promises");
      const raw = await readFile(join(SNAPSHOT_DIR, `${year}.json`), "utf8");
      const snap = JSON.parse(raw) as SundayPlaylistSnapshot;
      songsByYear[String(year)] = snap.songs.length;
      for (const song of snap.songs) {
        if (song.rvtr) rvtrMatched += 1;
        else noRvtr += 1;
      }
    } catch {
      songsByYear[String(year)] = 0;
    }
  }

  return { songsByYear, rvtrMatched, noRvtr };
}

/** Rebuild Sunday Nights operational inventory and return operator report. */
export async function refreshSundayNightsData(): Promise<SundayRefreshReport> {
  const notes: string[] = [];
  const production = useSundayNightsSnapshots();
  let snapshotsWritten = false;
  let songsByYear: Record<string, number>;
  let rvtrMatched = 0;
  let noRvtr = 0;

  if (production) {
    notes.push(
      "Production mode: bundled snapshots are read-only. Run Refresh locally, commit, then Deploy.",
    );
    const counts = await countFromExistingSnapshots();
    songsByYear = counts.songsByYear;
    rvtrMatched = counts.rvtrMatched;
    noRvtr = counts.noRvtr;
  } else {
    songsByYear = await writeSnapshots();
    snapshotsWritten = true;
    const counts = await countFromExistingSnapshots();
    rvtrMatched = counts.rvtrMatched;
    noRvtr = counts.noRvtr;
    notes.push("Local snapshots exported from VirtualDJ MyLists.");
  }

  const [assetLibrary, aliasStore] = await Promise.all([
    loadSundayAssetLibrary(),
    loadRvtrAliasStore(),
  ]);

  const { validateSundayNights } = await import("./validate");
  const validation = await validateSundayNights();

  return {
    refreshedAt: new Date().toISOString(),
    mode: production ? "production" : "local",
    snapshotsWritten,
    songsByYear,
    assets: assetLibrary.items.length,
    rvtrMatched,
    noRvtr,
    aliases: Object.keys(aliasStore.aliases).length,
    validation: validation.pass ? "PASS" : "FAIL",
    validationDetails: validation.failures,
    notes,
  };
}

export { exportYear, SNAPSHOT_DIR };
