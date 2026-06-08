#!/usr/bin/env npx tsx
/**
 * Verify dedupe + cluster + pile deal counts for crate builder years.
 */
import { dedupeMyListsPool } from "../../lib/ops/crate-builder/dedupe";
import { loadCrateBuilder } from "../../lib/ops/crate-builder/load";
import { loadYearPool } from "../../lib/ops/show-builder/parse-vdjfolder";

async function main() {
  console.log("=== Duplicate audit ===\n");
  for (const year of [1967, 1978, 1992]) {
    const raw = await loadYearPool(year);
    const { songs, sourceRowCount, duplicateCount } = dedupeMyListsPool(raw);
    console.log(`${year}: ${sourceRowCount} MyLists rows → ${songs.length} unique (${duplicateCount} dupes)`);
  }

  console.log("\n=== Experiment B — pile counts ===\n");
  for (const year of [1967, 1978, 1992]) {
    const data = await loadCrateBuilder(year);
    console.log(`${year}: ${data.songCount} songs → ${data.clusterCount} AI groups`);
    console.log("  Pile counts:");
    for (const set of data.sets) {
      const label = data.dealSummary.pileLabels[set.id] ?? set.id;
      console.log(`    ${label}: ${data.dealSummary.pileCounts[set.id] ?? 0}`);
    }
    console.log("  Top clusters:");
    for (const row of data.dealSummary.clusterDistribution.slice(0, 5)) {
      const piles = data.sets
        .map((set) => {
          const count = row.pileCounts[set.id] ?? 0;
          return count > 0 ? `${data.dealSummary.pileLabels[set.id]}:${count}` : null;
        })
        .filter(Boolean)
        .join(", ");
      console.log(`    ${row.clusterId} (${row.total}) → ${piles}`);
    }
    console.log("");
  }
}

main();
