import { loadReviewUniverse } from "../../lib/ops/load-review-universe";
import { normArtist } from "../../lib/ops/year-workspace/active-year-bridge";
import { loadActiveYearConnections } from "../../lib/ops/year-workspace/active-year-connections";
import {
  DEFAULT_REVIEW_ROW_FILTER,
  filterReviewRows,
} from "../../lib/ops/year-workspace/review-filters";
import {
  REVIEW_UNIVERSE_1967_TAG_IDS,
  RV_TAG_VOCABULARY,
} from "../../lib/ops/rvtags-review/vocabulary";

async function main() {
  const data = await loadReviewUniverse(1967);
  const rows = data.workspace.reviewRows;
  const bridges = data.bridges;

  const fill = rows.filter((r) => r.classification === "Fill");
  const cocktail = rows.filter((r) => r.classification === "Cocktail");
  const withPlays = rows.filter((r) => r.playCount != null);
  const withoutPlays = rows.filter((r) => r.playCount == null);
  const tagged = rows.filter((r) => r.historicalTags.length > 0);
  const untagged = rows.filter((r) => r.historicalTags.length === 0);

  const fillFilter = filterReviewRows(rows, {
    ...DEFAULT_REVIEW_ROW_FILTER,
    needsReviewOnly: true,
  });
  const cocktailFilter = filterReviewRows(rows, {
    ...DEFAULT_REVIEW_ROW_FILTER,
    classification: "Cocktail",
  });

  console.log("=== DATA AUDIT ===");
  console.log(JSON.stringify({
    totalVideos: rows.length,
    withPlayCounts: withPlays.length,
    withoutPlayCounts: withoutPlays.length,
    needingRetroverseTags: untagged.length,
    alreadyTagged: tagged.length,
    fillCount: fill.length,
    cocktailCount: cocktail.length,
    needsReviewFilterRows: fillFilter.length,
    cocktailFilterRows: cocktailFilter.length,
  }, null, 2));

  console.log("\n=== APPROVED 1967 TAG VOCABULARY ===");
  for (const id of REVIEW_UNIVERSE_1967_TAG_IDS) {
    const def = RV_TAG_VOCABULARY.find((t) => t.id === id);
    console.log(`  ${def?.label ?? id}`);
  }

  const bridgeArtists = new Map<
    string,
    { display: string; songs: string[]; bridge: (typeof bridges)[string] }
  >();
  for (const row of rows) {
    const norm = normArtist(row.artist);
    const b = bridges[norm];
    if (!b?.bridgeYears.length) continue;
    const entry = bridgeArtists.get(norm) ?? {
      display: row.artist,
      songs: [],
      bridge: b,
    };
    entry.songs.push(row.title);
    bridgeArtists.set(norm, entry);
  }

  console.log("\n=== BRIDGE ARTIST AUDIT ===");
  console.log("totalBridgeArtists:", bridgeArtists.size);

  for (const [, info] of [...bridgeArtists.entries()].sort((a, b) =>
    a[1].display.localeCompare(b[1].display),
  )) {
    const conn = await loadActiveYearConnections({
      focusYear: 1967,
      artist: info.display,
    });
    const hits1978 = conn.artistByYear[1978] ?? [];
    const hits1992 = conn.artistByYear[1992] ?? [];
    const best1978 = hits1978.reduce<number | null>(
      (best, h) => (h.peak != null && (best == null || h.peak < best) ? h.peak : best),
      null,
    );
    const best1992 = hits1992.reduce<number | null>(
      (best, h) => (h.peak != null && (best == null || h.peak < best) ? h.peak : best),
      null,
    );

    console.log("\nArtist:", info.display);
    console.log("  1967 songs:", info.songs.length, "—", info.songs.join(" · "));
    console.log("  1978 reason:", hits1978.map((h) => `${h.title} (#${h.peak})`).join("; ") || "(none)");
    console.log("  1978 best peak:", best1978 ?? "—");
    console.log("  1992 hits:", hits1992.map((h) => `${h.title} (#${h.peak})`).join("; ") || "(none)");
    console.log("  tier:", info.bridge.tier, "years:", info.bridge.bridgeYears.join(", "));
  }

  console.log("\n=== BRIDGE THRESHOLD RECOMMENDATION (not implemented) ===");
  console.log(`Blue [1978]: artist has Hot 100 in 1978 with best peak <= 40, OR 2+ distinct titles in 1978.
Gold [1978+1992]: meets Blue for 1978 AND has Hot 100 in 1992 with best peak <= 40 (or 2+ titles).
Exclude: single re-release/revival entries peaking > 50 (e.g. Beatles #71, Beach Boys Peggy Sue #59).`);
}

void main();
