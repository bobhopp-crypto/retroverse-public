/**
 * Step 3 verification — setReview + bulkSetClassification persistence.
 * Run: npx tsx tools/year-review/test-review-persistence.ts
 */
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { effectiveClassification } from "../../lib/ops/year-workspace/review-types";
import {
  reviewForKey,
  saveBulkClassification,
  saveYearReviewRecord,
} from "../../lib/ops/year-workspace/review-state";
import { loadYearWorkspaceState } from "../../lib/ops/year-workspace/state";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main() {
  const dir = await mkdtemp(join(tmpdir(), "rv-review-persist-"));
  const prev = process.env.RETROVERSE_DATA_ROOT;
  process.env.RETROVERSE_DATA_ROOT = dir;
  const year = 1967;

  try {
    const wsDir = join(dir, "ops", "year-workspace");
    await mkdir(wsDir, { recursive: true });

    const keyOne = "chart-track-1001";
    const bulkKeys = Array.from({ length: 10 }, (_, i) => `chart-track-bulk-${i + 1}`);
    const lockedKey = "chart-track-locked";

    // Test 1 — single Dance
    await saveYearReviewRecord(year, keyOne, { classification: "Dance" });
    let state = await loadYearWorkspaceState(year);
    assert(
      reviewForKey(state, keyOne)?.classification === "Dance",
      "Test 1: Dance should persist after reload",
    );

    const disk1 = JSON.parse(await readFile(join(wsDir, `${year}.json`), "utf8")) as {
      version: number;
      reviews: Record<string, { classification?: string }>;
    };
    assert(disk1.version === 3, "Test 1: disk version 3");
    assert(disk1.reviews[keyOne]?.classification === "Dance", "Test 1: Dance on disk");

    // Test 2 — bulk Cocktail
    await saveBulkClassification(year, bulkKeys, "Cocktail");
    state = await loadYearWorkspaceState(year);
    for (const key of bulkKeys) {
      assert(
        reviewForKey(state, key)?.classification === "Cocktail",
        `Test 2: ${key} should be Cocktail`,
      );
    }

    const disk2 = JSON.parse(await readFile(join(wsDir, `${year}.json`), "utf8")) as {
      reviews: Record<string, { classification?: string }>;
    };
    assert(
      bulkKeys.every((k) => disk2.reviews[k]?.classification === "Cocktail"),
      "Test 2: all bulk keys Cocktail on disk",
    );

    // Test 3 — locked Fill blocks auto-promote at playCount 20
    await saveYearReviewRecord(year, lockedKey, {
      classification: "Fill",
      classificationLocked: true,
    });
    state = await loadYearWorkspaceState(year);
    const record = reviewForKey(state, lockedKey);
    assert(record?.classification === "Fill", "Test 3: Fill persisted");
    assert(record?.classificationLocked === true, "Test 3: lock persisted");
    assert(
      effectiveClassification(record, 20) === "Fill",
      "Test 3: effective classification must stay Fill (no auto Cocktail)",
    );
    assert(
      effectiveClassification(record, 20) !== "Cocktail",
      "Test 3: must NOT auto-promote to Cocktail",
    );

    console.log("Step 3 persistence: all checks passed");
    console.log(
      JSON.stringify(
        {
          test1: { key: keyOne, classification: reviewForKey(state, keyOne)?.classification },
          test2: { bulkCount: bulkKeys.length, sample: reviewForKey(state, bulkKeys[0])?.classification },
          test3: {
            key: lockedKey,
            persisted: record,
            effectiveAtPlay20: effectiveClassification(record, 20),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    process.env.RETROVERSE_DATA_ROOT = prev;
    await rm(dir, { recursive: true, force: true });
  }
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
