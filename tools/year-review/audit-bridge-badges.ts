import { loadReviewUniverse } from "../../lib/ops/load-review-universe";
import { normArtist } from "../../lib/ops/year-workspace/active-year-bridge";
import { loadActiveYearConnections } from "../../lib/ops/year-workspace/active-year-connections";

async function main() {
  const data = await loadReviewUniverse(1967);
  const rows = data.workspace.reviewRows;
  const bridges = data.bridges;

  const bridgeArtists = new Map<
    string,
    {
      display: string;
      bridge: (typeof bridges)[string];
      videos: string[];
    }
  >();

  for (const row of rows) {
    const norm = normArtist(row.artist);
    const b = bridges[norm];
    if (!b || b.bridgeYears.length === 0) continue;
    const entry = bridgeArtists.get(norm) ?? {
      display: row.artist,
      bridge: b,
      videos: [],
    };
    entry.videos.push(row.title);
    bridgeArtists.set(norm, entry);
  }

  console.log("TOTAL_BRIDGE_ARTISTS", bridgeArtists.size);
  console.log("");

  for (const [, info] of [...bridgeArtists.entries()].sort((a, b) =>
    a[1].display.localeCompare(b[1].display),
  )) {
    const conn = await loadActiveYearConnections({
      focusYear: 1967,
      artist: info.display,
    });
    const fmt = (year: number) =>
      (conn.artistByYear[year] ?? [])
        .map((h) => `${h.title} (#${h.peak})`)
        .join("; ") || "(none)";

    console.log("ARTIST:", info.display);
    console.log("  tier:", info.bridge.tier);
    console.log("  bridgeYears:", info.bridge.bridgeYears.join(", "));
    console.log("  reason: artist had Billboard Hot 100 entries in those years");
    console.log("  1978:", fmt(1978));
    console.log("  1992:", fmt(1992));
    console.log("  1967 videos:", info.videos.length);
    console.log("");
  }

  const fill = rows.filter((r) => r.classification === "Fill").length;
  const cocktail = rows.filter((r) => r.classification === "Cocktail").length;
  console.log("CLASS Fill", fill, "Cocktail", cocktail);
}

void main();
