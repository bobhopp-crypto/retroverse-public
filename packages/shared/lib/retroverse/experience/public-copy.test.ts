import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";

import { preparePublicSongSections } from "./public-song-display";
import {
  redactPublicTree,
  replacePrivatePaths,
  sanitizePublicCopy,
} from "./public-copy";

const CRAZY_FOR_YOU = [
  'Madonna\'s "Crazy For You" reached #1 on the Billboard Hot 100.',
  "The song peaked at #1 on the Billboard Hot 100 and spent 21 weeks on the chart.",
  "Crazy For You was released in 1995.",
  "Artist: Madonna · Title: Crazy For You · Album: Crazy For You / Gambler · Year: 1985 · Genre: Pop · Path: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/Madonna - Crazy For You.mp4.",
  "Chart story — peaked at #1 on the Hot 100.",
].join("\n\n");

function assertNoPrivatePath(text: string): void {
  assert.equal(/\/Users\//i.test(text), false, text);
  assert.equal(/VDJ:/i.test(text), false, text);
  assert.equal(/DJ MEDIA/i.test(text), false, text);
}

test("Crazy For You story drops the library path and raw field dump", () => {
  const sections = preparePublicSongSections({
    storyText: "",
    storyCards: [{ headline: "Crazy For You: The Breakthrough Moment", body: CRAZY_FOR_YOU, sourceUrl: null }],
    trivia: [],
    timeline: [],
  });
  const rendered = sections.storyCards.map((card) => `${card.headline} ${card.body}`).join("\n");
  assertNoPrivatePath(rendered);
  assert.equal(/Crazy For You \/ Gambler/.test(rendered), false);
  assert.equal(/released in 1995/.test(rendered), false);
  assert.match(rendered, /reached #1 on the Billboard Hot 100/);
});

test("public playhead ids do not keep the local file path", () => {
  const path = "/Users/bobhopp/DJ MEDIA/VIDEO/1970's/Jackson Browne - The Load Out Stay (1978).mp4";
  const redacted = redactPublicTree({
    item: {
      id: `vdj-live-current:${path}`,
      title: "Drag a song on this deck to load it",
      link: { kind: "song", id: `vdj:${path}`, label: "Drag a song on this deck to load it" },
    },
    live: { filepath: path, songKey: path, title: "The Load Out", artist: "Jackson Browne" },
    rvba: { id: `VDJ:${path.toUpperCase()}`, title: "Drag a song on this deck to load it" },
  });
  assertNoPrivatePath(JSON.stringify(redacted));
  assert.equal(redacted.live.filepath, null);
  assert.equal(redacted.item.title, "Drag a song on this deck to load it");
  assert.notEqual(redacted.item.id, `vdj-live-current:${path}`);
  assert.equal(replacePrivatePaths(`vdj:${path}`).includes("/"), false);
});

test("published song stories that contain local paths sanitize clean", async () => {
  const dir = join(process.cwd(), "data/bobos/song-packages");
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  let checked = 0;

  for (const name of names) {
    const raw = await readFile(join(dir, name), "utf8");
    if (!raw.includes("/Users/") && !raw.includes("VDJ:")) continue;
    const pkg = JSON.parse(raw) as {
      storyCards?: Array<{ fact?: string }>;
      researchVault?: Array<{ excerpt?: string }>;
    };
    const bodies = [
      ...(pkg.storyCards ?? []).map((card) => card.fact ?? ""),
      ...(pkg.researchVault ?? []).map((entry) => entry.excerpt ?? ""),
    ].filter(Boolean);
    if (bodies.length === 0) continue;
    checked += 1;
    const cleaned = sanitizePublicCopy(bodies.join("\n\n"));
    assertNoPrivatePath(cleaned);
  }

  assert.ok(checked >= 100, `expected path-bearing stories, checked ${checked}`);
});
