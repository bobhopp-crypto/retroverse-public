import assert from "node:assert/strict";
import test from "node:test";

import { inYourRetroverseSongs } from "./library-shelf";

test("library list keeps every owned song, including ones outside the featured slice", () => {
  const featured = Array.from({ length: 12 }, (_, index) => ({
    title: `Chart only ${index + 1}`,
    peakHot100: index + 1,
    chartWeeks: 30 - index,
    firstChartYear: 1984,
    coverageStatus: "missing" as const,
  }));
  const owned = [
    { title: "Take A Bow", peakHot100: 1, chartWeeks: 30, firstChartYear: 1994, coverageStatus: "owned" as const },
    { title: "Music", peakHot100: 1, chartWeeks: 24, firstChartYear: 2000, coverageStatus: "owned" as const },
    { title: "Vogue", peakHot100: 1, chartWeeks: 20, firstChartYear: 1990, coverageStatus: "owned" as const },
    { title: "Crazy For You", peakHot100: 1, chartWeeks: 18, firstChartYear: 1985, coverageStatus: "owned" as const },
    { title: "Holiday", peakHot100: 16, chartWeeks: 12, firstChartYear: 1983, coverageStatus: "owned" as const },
    { title: "Borderline", peakHot100: 10, chartWeeks: 30, firstChartYear: 1984, coverageStatus: "owned" as const },
    { title: "Lucky Star", peakHot100: 4, chartWeeks: 16, firstChartYear: 1984, coverageStatus: "owned" as const },
    { title: "Into the Groove", peakHot100: 1, chartWeeks: 14, firstChartYear: 1985, coverageStatus: "owned" as const },
    { title: "Open Your Heart", peakHot100: 1, chartWeeks: 12, firstChartYear: 1986, coverageStatus: "owned" as const },
  ];

  const listed = inYourRetroverseSongs([...featured, ...owned]);

  assert.equal(listed.length, 9);
  assert.equal(listed.length, owned.length);
  assert.ok(listed.some((song) => song.title === "Holiday"));
  assert.ok(listed.every((song) => song.coverageStatus === "owned"));
  assert.equal(
    listed.filter((song) => song.peakHot100 != null && song.peakHot100 > 12).length > 0,
    true,
  );
});
