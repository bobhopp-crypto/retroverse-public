/**
 * Export Sunday Nights playlist snapshots from local VirtualDJ MyLists.
 * Run locally before deploy: npx tsx tools/sunday-nights/export-snapshots.ts
 */
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import { loadVdjFolderFile } from "@/lib/ops/show-builder/parse-vdjfolder";
import { SUNDAY_EVENT_YEARS } from "@/lib/sunday-nights/playlist-types";
import { resolveRvtrForSongs } from "@/lib/sunday-nights/resolve-rvtr";
import type { SundayPlaylistSnapshot } from "@/lib/sunday-nights/snapshot-types";

const OUT_DIR = join(process.cwd(), "data", "sunday-nights", "snapshots");

function normPath(p: string): string {
  return p
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\\/g, "/")
    .trim();
}

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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  for (const year of SUNDAY_EVENT_YEARS) {
    const snap = await exportYear(year);
    const outPath = join(OUT_DIR, `${year}.json`);
    await writeFile(outPath, `${JSON.stringify(snap, null, 2)}\n`, "utf8");
    const withRvtr = snap.songs.filter((s) => s.rvtr).length;
    console.log(`${year}: ${snap.songs.length} songs (${withRvtr} with RVTR) → ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
