import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  HOT100_CREDIT,
  decadeHeading,
  formatChartRun,
  hot100Years,
  isHot100Year,
  parseHot100Year,
  youtubeIdFromUrl,
  youtubePlaylistLinks,
} from "./chart";

test("years cover 1958 through 2024", () => {
  const years = hot100Years();
  assert.equal(years.length, 67);
  assert.equal(years[0], 1958);
  assert.equal(years.at(-1), 2024);
  assert.equal(isHot100Year(1957), false);
  assert.equal(isHot100Year(2025), false);
  assert.equal(decadeHeading(1958), "The 1950s");
  assert.equal(decadeHeading(2024), "The 2020s");
});

test("chart run dates stay on the calendar day", () => {
  assert.equal(formatChartRun("1984-05-19", "1984-11-24"), "May 19 – Nov 24, 1984");
  assert.equal(formatChartRun("1969-12-06", "1970-03-14"), "Dec 6, 1969 – Mar 14, 1970");
});

test("playlist links chunk 50 ids and disappear when a year has none", () => {
  assert.deepEqual(youtubePlaylistLinks([]), []);
  assert.equal(youtubePlaylistLinks(["abcdefghijk"]).length, 1);
  assert.equal(youtubePlaylistLinks(["abcdefghijk"])[0]?.label, "Play this year");
  const ids = Array.from({ length: 51 }, (_, index) => `abcde${String(index).padStart(6, "0")}`.slice(0, 11));
  const links = youtubePlaylistLinks(ids);
  assert.equal(links.length, 2);
  assert.equal(links[0]?.label, "Play this year · 1–50");
  assert.equal(links[1]?.label, "Play this year · 51–51");
  assert.match(links[0]!.href, /^https:\/\/www\.youtube\.com\/watch_videos\?video_ids=/);
  assert.equal(links[0]!.href.split(",").length, 50);
});

test("only youtube watch ids become play links", () => {
  assert.equal(youtubeIdFromUrl(""), null);
  assert.equal(youtubeIdFromUrl("https://www.youtube.com/watch?v=oGpFcHTxjZs"), "oGpFcHTxjZs");
  assert.equal(youtubeIdFromUrl("https://example.com/watch?v=oGpFcHTxjZs"), null);
  assert.equal(youtubeIdFromUrl("/Users/shared/video.mp4"), null);
});

test("published charts keep the credit contract and drop empty videos", () => {
  const root = join(process.cwd(), "data/hot100-year-end");
  const year = (name: string) => parseHot100Year(Number(name.slice(0, 4)), JSON.parse(readFileSync(join(root, name), "utf8")));
  const y1958 = year("1958.json");
  const y1984 = year("1984.json");
  const y2024 = year("2024.json");
  assert.equal(y1958[0]?.title, "It's All In The Game");
  assert.equal(y1958.every((song) => song.youtubeId == null), true);
  assert.equal(youtubePlaylistLinks(y1958.map((song) => song.youtubeId ?? "")).length, 0);
  assert.equal(y1984[0]?.artist, "Tina Turner");
  assert.equal(y1984.filter((song) => song.youtubeId).length, 100);
  assert.equal(youtubePlaylistLinks(y1984.map((song) => song.youtubeId!)).length, 2);
  assert.equal(y2024[0]?.title, "A Bar Song (Tipsy)");
  assert.equal(y2024.every((song) => song.youtubeId == null), true);
  assert.equal(HOT100_CREDIT.includes("Billboard Hot 100"), true);
  const serialized = JSON.stringify(y1984);
  assert.equal(serialized.includes("/Users/"), false);
  assert.equal(serialized.includes("score"), false);
});
