import assert from "node:assert/strict";
import test from "node:test";

import {
  MAGAZINE_HEX,
  contrastRatio,
  createPaletteAssigner,
  heroColor,
  inkOn,
} from "./magazine-palette";

test("artist name picks one of the sixteen hues", () => {
  assert.equal(heroColor("Madonna"), "#d036ff");
  assert.equal(heroColor("The Georgia Satellites"), "#ff2937");
  assert.ok(MAGAZINE_HEX.includes(heroColor("Fleetwood Mac") as (typeof MAGAZINE_HEX)[number]));
});

test("ink on every swatch clears 4.5:1", () => {
  for (const hex of MAGAZINE_HEX) {
    const ink = inkOn(hex);
    assert.ok(ink === "#07070d" || ink === "#ffffff");
    assert.ok(contrastRatio(hex, ink) >= 4.5, `${hex} on ${ink}`);
  }
});

test("assignment matches the magazine template for the opening slots", () => {
  const paint = createPaletteAssigner("#d036ff");
  const wm = paint.take("b:wm", 1);
  const kick = paint.take("div:kick", 2);
  const dek = paint.take("div:dek", 1);
  const by = paint.take("div:by", 1);
  const bar = paint.take("div:bar", 1);
  const rail = paint.take("nav:rail", 1);
  const first = paint.take("a:on", 1);
  const second = paint.take("a:", 1);
  const third = paint.take("a:", 1);
  const chapter = paint.take("section:ch", 1);
  const no = paint.take("div:no", 2);
  const heading = paint.take("h2:", 1);
  const range = paint.take("div:rng", 2);
  const drop = paint.take("p:dc", 1);

  assert.deepEqual(
    [wm.a, kick.a, kick.b, dek.a, by.a, bar.a, rail.a, first.a, second.a, third.a, chapter.a, no.a, no.b, heading.a, range.a, range.b, drop.a],
    [
      "#00cc44",
      "#ffbb00",
      "#3d7eff",
      "#ff00a1",
      "#00c2a2",
      "#ff8800",
      "#b2ff00",
      "#7373ff",
      "#00ddff",
      "#ff4d00",
      "#ffee00",
      "#9c63ff",
      "#0099ff",
      "#ff2937",
      "#3de600",
      "#ffbb00",
      "#3d7eff",
    ],
  );
  assert.equal(wm.ink, "#07070d");
});

test("neighbors never share a hue and the sixteen stay in balance", () => {
  const paint = createPaletteAssigner("#d036ff");
  const colors: string[] = [];
  for (let i = 0; i < 160; i += 1) colors.push(paint.take("div:yr", 1).a);
  for (let i = 1; i < colors.length; i += 1) {
    assert.notEqual(colors[i], colors[i - 1]);
  }
  const counts = paint.counts();
  const values = MAGAZINE_HEX.map((hex) => counts[hex] ?? 0);
  assert.ok(Math.max(...values) - Math.min(...values) <= 2);
  assert.ok(values.every((count) => count > 0));
});
