import assert from "node:assert/strict";
import test from "node:test";

import { normalizePassSerial, passMatchesNormalizedSerial } from "./serials";

test("normalizes current and legacy public pass serial variants", () => {
  for (const input of ["RVSN500", "rvsn500", "RVSN-500", "500", "  RVSN500  "]) {
    assert.deepEqual(normalizePassSerial(input), { number: 500 });
  }
});

test("rejects empty, malformed, zero, and unsafe serial input", () => {
  for (const input of ["", "   ", "random text", "RVSN-", "RVSN50O", "0", "-500", "RVSN999999999999999999999"]) {
    assert.equal(normalizePassSerial(input), null);
  }
});

test("route identity resolves variants to an existing stored pass only", () => {
  const legacyPass = { serial: "0500", serialNumber: 500 };
  const prefixedPass = { serial: "RVSN000501", serialNumber: 501 };

  for (const input of ["RVSN500", "rvsn500", "RVSN-500", "500"]) {
    const normalized = normalizePassSerial(input);
    assert.ok(normalized);
    assert.equal(passMatchesNormalizedSerial(legacyPass, normalized), true);
    assert.equal(passMatchesNormalizedSerial(prefixedPass, normalized), false);
  }

  const unknown = normalizePassSerial("RVSN999999");
  assert.ok(unknown);
  assert.equal(passMatchesNormalizedSerial(legacyPass, unknown), false);
  assert.equal(passMatchesNormalizedSerial(prefixedPass, unknown), false);
});

test("resolution is independent of existing registration state", () => {
  const normalized = normalizePassSerial("RVSN500");
  assert.ok(normalized);

  const unregistered = { serial: "0500", serialNumber: 500, status: "available" };
  const registered = { serial: "RVSN000500", serialNumber: 500, status: "registered" };
  assert.equal(passMatchesNormalizedSerial(unregistered, normalized), true);
  assert.equal(passMatchesNormalizedSerial(registered, normalized), true);
});
