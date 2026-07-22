import assert from "node:assert/strict";
import test from "node:test";

import { isPlausiblePassSerial, normalizePassSerial, parsePassCredential } from "./types";

test("opaque identifiers of any generation are accepted", () => {
  for (const id of [
    "RVSN000163",
    "rvsn00427",
    "000163",
    "163",
    "MAINPUB-42",
    "VIP-A",
    "LIVEAID2026",
    "notapass",
    "EVENT-2026-0001",
  ]) {
    assert.equal(normalizePassSerial(id), id, `expected ${JSON.stringify(id)} to be accepted`);
    assert.equal(isPlausiblePassSerial(id), true);
  }
});

test("normalizePassSerial trims only — no case or format rewrite", () => {
  assert.equal(normalizePassSerial("  RVSN00427  "), "RVSN00427");
  assert.equal(normalizePassSerial("  vip-a  "), "vip-a");
  assert.equal(normalizePassSerial(null), null);
  assert.equal(normalizePassSerial(42), null);
});

test("parsePassCredential rejects empty, oversized, and path-unsafe values", () => {
  assert.equal(parsePassCredential(""), null);
  assert.equal(parsePassCredential("   "), null);
  assert.equal(parsePassCredential("a".repeat(101)), null);
  assert.equal(parsePassCredential("foo/bar"), null);
  assert.equal(parsePassCredential("foo\\bar"), null);
  assert.equal(parsePassCredential("foo?x=1"), null);
  assert.equal(parsePassCredential("foo#frag"), null);
  assert.equal(parsePassCredential("has\0null"), null);
  assert.equal(parsePassCredential("anything-opaque"), "anything-opaque");
});
