import assert from "node:assert/strict";
import test from "node:test";

import { isPlausiblePassSerial, normalizePassSerial, parsePassCredential } from "./types";

test("isPlausiblePassSerial accepts RVSN + 3-8 digits, case-insensitively", () => {
  assert.equal(isPlausiblePassSerial("RVSN000163"), true);
  assert.equal(isPlausiblePassSerial("rvsn00427"), true);
  assert.equal(isPlausiblePassSerial("RVSN500"), true);
});

test("isPlausiblePassSerial rejects garbage, out-of-range digits, and other formats", () => {
  for (const bad of ["notapass", "EVENT-2026-0001", "RVSN12", "RVSN123456789", "12345", "RVSN", ""]) {
    assert.equal(isPlausiblePassSerial(bad), false, `expected ${JSON.stringify(bad)} to be implausible`);
  }
});

test("normalizePassSerial trims, validates, and uppercases in one step", () => {
  assert.equal(normalizePassSerial("  rvsn00427  "), "RVSN00427");
  assert.equal(normalizePassSerial("RVSN00427"), "RVSN00427");
  assert.equal(normalizePassSerial("not-a-pass"), null);
  assert.equal(normalizePassSerial(null), null);
  assert.equal(normalizePassSerial(42), null);
});

test("parsePassCredential remains permissive (format is checked separately)", () => {
  assert.equal(parsePassCredential("anything-opaque"), "anything-opaque");
  assert.equal(parsePassCredential(""), null);
  assert.equal(parsePassCredential("a".repeat(101)), null);
});
