import assert from "node:assert/strict";
import test from "node:test";

import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

import { resolvePublicPass, statusForPublicPassResolution } from "./resolution";
import { normalizePassSerial, PassSerialAmbiguityError, type PassScanResult } from "./types";

const normalized = normalizePassSerial("RVSN500")!;
const unclaimed: PassScanResult = {
  state: "unclaimed",
  pass: { serial: "RVSN500", claimed: false, visitorId: null, claimedAt: null },
};
const claimed: PassScanResult = {
  state: "claimed",
  pass: { serial: "RVSN500", claimed: true, visitorId: 7, claimedAt: "2026-07-12T00:00:00.000Z" },
  visitor: { id: 7, firstName: "Pat", email: "pat@example.com", phone: null, createdAt: "2026-07-12T00:00:00.000Z" },
};
const fallback = { id: "pass-id" } as GeneratedPass;

test("existing Postgres pass wins without consulting JSON", async () => {
  let fallbackCalled = false;
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => unclaimed,
    scanFallback: async () => { fallbackCalled = true; return { state: "found", pass: fallback }; },
  });
  assert.equal(result.state, "canonical");
  assert.equal(fallbackCalled, false);
});

test("claimed Postgres pass preserves its registered visitor", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => claimed,
    scanFallback: async () => ({ state: "not_found" }),
  });
  assert.deepEqual(result, { state: "canonical", scan: claimed });
});

test("JSON is fallback only after a confirmed Postgres miss", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => null,
    scanFallback: async () => ({ state: "found", pass: fallback }),
  });
  assert.deepEqual(result, { state: "fallback", pass: fallback });
});

test("JSON read failure returns controlled 503", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => null,
    scanFallback: async () => { throw new Error("invalid JSON"); },
  });
  assert.deepEqual(result, { state: "unavailable" });
  assert.equal(statusForPublicPassResolution(result), 503);
});

test("Postgres failure never falls through to JSON", async () => {
  let fallbackCalled = false;
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => { throw new Error("offline"); },
    scanFallback: async () => { fallbackCalled = true; return { state: "found", pass: fallback }; },
  });
  assert.deepEqual(result, { state: "unavailable" });
  assert.equal(fallbackCalled, false);
});

test("Postgres failure before resolved-page rendering maps to 503, never 500", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => { throw new Error("connection lost"); },
    scanFallback: async () => ({ state: "not_found" }),
  });
  assert.equal(result.state, "unavailable");
  assert.equal(statusForPublicPassResolution(result), 503);
});

test("duplicate Postgres keys return controlled ambiguity", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => { throw new PassSerialAmbiguityError(); },
    scanFallback: async () => ({ state: "not_found" }),
  });
  assert.deepEqual(result, { state: "ambiguous" });
});

test("unknown serial remains not found", async () => {
  const result = await resolvePublicPass(normalized, {
    scanCanonical: async () => null,
    scanFallback: async () => ({ state: "not_found" }),
  });
  assert.deepEqual(result, { state: "not_found" });
  assert.equal(statusForPublicPassResolution(result), 404);
});

test("controlled public resolution outcomes never map user input to HTTP 500", () => {
  assert.equal(normalizePassSerial("random text"), null); // route maps malformed input to 400
  for (const resolution of [
    { state: "not_found" as const },
    { state: "ambiguous" as const },
    { state: "unavailable" as const },
  ]) {
    assert.notEqual(statusForPublicPassResolution(resolution), 500);
  }
});
