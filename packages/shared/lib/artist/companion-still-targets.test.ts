import assert from "node:assert/strict";
import test from "node:test";

import { companionStillTargets, TOP_SONG_STILL_COUNT } from "./companion-still-targets";

function song(
  n: number,
  peak: number,
  firstChartDate: string,
  coverageStatus: "owned" | "missing" = "missing",
) {
  return {
    rvtr: `RVTR${String(n).padStart(6, "0")}`,
    title: `Song ${n}`,
    peakHot100: peak,
    chartWeeks: 10,
    firstChartYear: Number(firstChartDate.slice(0, 4)),
    firstChartDate,
    coverageStatus,
  };
}

test("companion stills cover top songs before early chart entries", () => {
  const early = Array.from({ length: 20 }, (_, index) =>
    song(index + 1, 40 + index, `1979-0${(index % 9) + 1}-01`),
  );
  const top = Array.from({ length: TOP_SONG_STILL_COUNT }, (_, index) =>
    song(100 + index, index + 1, "1990-06-01"),
  );
  const ownedOutsideTop = song(200, 80, "1975-01-01", "owned");

  const targets = companionStillTargets({
    songs: [...early, ownedOutsideTop, ...top],
    signatureRvtrs: ["RVTR000300", "not-a-track"],
  });

  assert.deepEqual(
    targets.slice(0, TOP_SONG_STILL_COUNT),
    top.map((row) => row.rvtr),
  );
  assert.equal(targets.indexOf("RVTR000200"), TOP_SONG_STILL_COUNT);
  assert.equal(targets.includes("RVTR000001"), false);
  assert.equal(targets.includes("RVTR000300"), true);
  assert.equal(targets.includes("NOT-A-TRACK"), false);
});
