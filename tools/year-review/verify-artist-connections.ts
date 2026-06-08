import { loadVideoUniverseRows } from "../../lib/ops/year-workspace/load-video-universe";
import {
  bridgeFromArtistYears,
  loadActiveYearConnections,
  normArtist,
  yearsWithArtistHits,
  yearsWithSongHits,
} from "../../lib/ops/year-workspace/active-year-connections";

const CASES = [
  { label: "Bee Gees", match: (a: string) => a.toLowerCase().includes("bee gees") },
  {
    label: "Temptations",
    match: (a: string) => a.toLowerCase().includes("temptation"),
  },
  {
    label: "Aretha Franklin",
    match: (a: string) => a.toLowerCase().includes("aretha"),
  },
  { label: "Monkees", match: (a: string) => a.toLowerCase().includes("monkee") },
] as const;

function fmtHits(
  blocks: Array<{ year: number; hits: Array<{ title: string; peak: number | null }> }>,
) {
  return blocks.map((b) => ({
    year: b.year,
    hits: b.hits.map((h) => `${h.title} (#${h.peak})`),
  }));
}

async function main() {
  const rows = await loadVideoUniverseRows(1967);
  const focusYear = 1967;

  for (const spec of CASES) {
    const videos = rows.filter((r) => spec.match(r.artist));
    console.log(`\n========== ${spec.label} (${videos.length} videos in universe) ==========`);

    if (videos.length === 0) {
      console.log("No 1967 video rows.");
      continue;
    }

    const canonical =
      videos.find((v) => v.artist.toLowerCase().startsWith("the ")) ?? videos[0];

    for (const row of videos) {
      const conn = await loadActiveYearConnections({
        focusYear,
        artist: row.artist,
        title: row.title,
      });
      const bridge = bridgeFromArtistYears(focusYear, conn.activeYears, conn.artistByYear);
      const artistBlocks = yearsWithArtistHits(conn);
      const songBlocks = yearsWithSongHits(conn);

      console.log("\n---", row.artist, "·", row.title, "---");
      console.log("artistNorm:", conn.artistNorm);
      console.log("bridge:", bridge);
      console.log("Artist Connections:", JSON.stringify(fmtHits(artistBlocks), null, 2));
      console.log("Song Connections:", JSON.stringify(fmtHits(songBlocks), null, 2));
    }

    const bridgeNorm = normArtist(canonical.artist);
    const conn = await loadActiveYearConnections({
      focusYear,
      artist: canonical.artist,
      title: canonical.title,
    });
    console.log("\nCanonical row for badges:", canonical.artist, "·", canonical.title);
    console.log(
      "Bridge index key:",
      bridgeNorm,
      bridgeFromArtistYears(focusYear, conn.activeYears, conn.artistByYear),
    );
  }
}

void main();
