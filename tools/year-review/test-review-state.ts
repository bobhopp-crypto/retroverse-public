/**
 * Year Review state v3 — migration + classification helpers.
 * Run: npx tsx tools/year-review/test-review-state.ts
 */
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  effectiveClassification,
  migrateReviews,
  needsReview,
  normalizeReviewRecord,
} from "../../lib/ops/year-workspace/review-types";
import {
  applyBulkClassification,
  applyReviewPatch,
} from "../../lib/ops/year-workspace/review-state";
import {
  loadYearWorkspaceState,
  migrateParsedState,
  persistYearWorkspaceState,
} from "../../lib/ops/year-workspace/state";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// --- pure helpers ---
assert(effectiveClassification(undefined, null) === "Fill", "default Fill");
assert(effectiveClassification(undefined, 5) === "Cocktail", "auto Cocktail at 5");
assert(effectiveClassification(undefined, 10) === "Cocktail", "auto Cocktail above 5");
assert(
  effectiveClassification({ classification: "Fill", classificationLocked: true }, 10) ===
    "Fill",
  "locked Fill blocks auto-promote",
);
assert(
  effectiveClassification({ classification: "Dance" }, 10) === "Dance",
  "manual classification wins",
);

assert(needsReview(undefined, null) === true, "needsReview null play");
assert(needsReview(undefined, 4) === true, "needsReview play 4");
assert(needsReview(undefined, 5) === false, "needsReview play 5 auto Cocktail");
assert(needsReview({ classification: "Slow" }, 0) === false, "needsReview manual Slow");

const tagged = normalizeReviewRecord({
  classification: "Cocktail",
  historicalTags: ["Motown", "#Soul"],
});
assert(tagged?.classification === "Cocktail", "normalize classification");
assert(tagged?.historicalTags?.join(",") === "Motown,Soul", "normalize tags");

const migratedReviews = migrateReviews({
  "chart-track-1": { classification: "Dance" },
  bad: null,
  "chart-track-2": { historicalTags: ["DeepCut"] },
});
assert(Object.keys(migratedReviews).length === 2, "migrateReviews count");

// --- v1 / v2 / v3 migration ---
const v1 = migrateParsedState(
  { version: 1, year: 1967, keywords: { k: ["Crowd Favorite"] }, updatedAt: "x" },
  1967,
);
assert(v1.version === 3 && v1.reviews && Object.keys(v1.reviews).length === 0, "v1→v3");

const v2 = migrateParsedState(
  {
    version: 2,
    year: 1967,
    keywords: {},
    chartActions: { "chart-track-9": "acquire" },
    updatedAt: "y",
  },
  1967,
);
assert(v2.version === 3 && v2.chartActions["chart-track-9"] === "acquire", "v2→v3");

const v3 = migrateParsedState(
  {
    version: 3,
    year: 1967,
    keywords: {},
    chartActions: {},
    reviews: { "chart-track-1": { classification: "Slow" } },
    updatedAt: "z",
  },
  1967,
);
assert(v3.reviews["chart-track-1"]?.classification === "Slow", "v3 round-trip");

// --- patch + bulk (in-memory) ---
let mem = v3;
mem = applyReviewPatch(mem, "chart-track-2", {
  classification: "Fill",
  classificationLocked: true,
  historicalTags: ["BritishInvasion"],
});
assert(mem.reviews["chart-track-2"]?.classificationLocked === true, "patch locked");
assert(mem.reviews["chart-track-2"]?.historicalTags?.[0] === "BritishInvasion", "patch tags");

mem = applyBulkClassification(mem, ["chart-track-1", "chart-track-2"], "Cocktail");
assert(mem.reviews["chart-track-1"]?.classification === "Cocktail", "bulk row 1");
assert(mem.reviews["chart-track-2"]?.classification === "Cocktail", "bulk row 2");

mem = applyReviewPatch(mem, "chart-track-1", { classification: null, historicalTags: null });
assert(mem.reviews["chart-track-1"] == null, "clear removes empty record");

// --- disk round-trip ---
async function diskRoundTrip() {
  const dir = await mkdtemp(join(tmpdir(), "rv-review-test-"));
  const prev = process.env.RETROVERSE_DATA_ROOT;
  process.env.RETROVERSE_DATA_ROOT = dir;

  try {
    const wsDir = join(dir, "ops", "year-workspace");
    await mkdir(wsDir, { recursive: true });
    await writeFile(
      join(wsDir, "1967.json"),
      `${JSON.stringify(
        {
          version: 2,
          year: 1967,
          keywords: { "chart-track-1": ["Party Starter"] },
          chartActions: {},
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const loaded = await loadYearWorkspaceState(1967);
    assert(loaded.version === 3, "disk load upgrades to v3");
    assert(loaded.keywords["chart-track-1"]?.[0] === "Party Starter", "keywords preserved");

    const onDisk = JSON.parse(await readFile(join(wsDir, "1967.json"), "utf8")) as {
      version: number;
      reviews: Record<string, unknown>;
    };
    assert(onDisk.version === 3, "disk file rewritten as v3");
    assert(onDisk.reviews != null, "reviews key on disk");

    loaded.reviews["chart-track-99"] = {
      classification: "Dance",
      updatedAt: new Date().toISOString(),
    };
    await persistYearWorkspaceState(loaded);

    const again = await loadYearWorkspaceState(1967);
    assert(again.reviews["chart-track-99"]?.classification === "Dance", "persist round-trip");
  } finally {
    process.env.RETROVERSE_DATA_ROOT = prev;
    await rm(dir, { recursive: true, force: true });
  }
}

void diskRoundTrip().then(() => {
  console.log("year-review state v3: all checks passed");
});
