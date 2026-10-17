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

test("every published year has a play button and two playlist chunks", () => {
  const root = join(process.cwd(), "data/hot100-year-end");
  const year = (name: string) => parseHot100Year(Number(name.slice(0, 4)), JSON.parse(readFileSync(join(root, name), "utf8")));
  for (const [name, title, artist] of [
    ["1958.json", "It's All In The Game", "Tommy Edwards"],
    ["1984.json", "What's Love Got To Do With It", "Tina Turner"],
    ["2024.json", "A Bar Song (Tipsy)", "Shaboozey"],
  ] as const) {
    const songs = year(name);
    assert.equal(songs[0]?.title, title);
    assert.equal(songs[0]?.artist, artist);
    assert.equal(songs.filter((song) => song.youtubeId).length, 100);
    const playlists = youtubePlaylistLinks(songs.map((song) => song.youtubeId!));
    assert.equal(playlists.length, 2);
    assert.equal(playlists[0]?.label, "Play this year · 1–50");
    assert.equal(playlists[1]?.label, "Play this year · 51–100");
    assert.equal(playlists[0]!.href.split("video_ids=")[1]!.split(",").length, 50);
    assert.equal(playlists[1]!.href.split("video_ids=")[1]!.split(",").length, 50);
  }
  assert.equal(HOT100_CREDIT.includes("Billboard Hot 100"), true);
  const serialized = JSON.stringify(year("1984.json"));
  assert.equal(serialized.includes("/Users/"), false);
  assert.equal(serialized.includes("score"), false);
});
