import assert from "node:assert/strict";
import test from "node:test";

import { registerResolvedPass } from "./registration";
import type { GeneratedPass, PassRegistration } from "./types";

function pass(id: string, serial = "0500"): GeneratedPass {
  return {
    id, serial, serialNumber: Number(serial), batchId: "batch", eventId: "event",
    eventName: "Fixture", venue: "Fixture", date: "2026-07-12", passType: "General",
    templateId: "template", generationId: null, front: { artworkUrl: null },
    back: { artworkUrl: null }, qr: { url: "https://retroverse.live/pass/0500", svg: "" },
    status: "available", registration: null, createdAt: "2026-07-12T00:00:00.000Z",
  };
}

const registration: PassRegistration = {
  firstName: "Pat", lastName: "", email: "", phone: "", city: "", notes: "",
  giveawayOptIn: false, registeredAt: "2026-07-12T00:00:00.000Z",
};

test("fabricated client passId cannot mutate a pass", async () => {
  let mutations = 0;
  const result = await registerResolvedPass("0500", "fabricated", registration, {
    resolveSerial: async () => ({ state: "found", pass: pass("real-id") }),
    registerById: async () => { mutations += 1; return { state: "not_found" }; },
  });
  assert.deepEqual(result, { ok: false, status: 409, error: "Pass identity does not match the scanned serial." });
  assert.equal(mutations, 0);
});

test("mismatched serial and passId cannot mutate a pass", async () => {
  let mutatedId: string | null = null;
  const result = await registerResolvedPass("0501", "id-for-0500", registration, {
    resolveSerial: async () => ({ state: "found", pass: pass("id-for-0501", "0501") }),
    registerById: async (_normalized, id) => { mutatedId = id; return { state: "not_found" }; },
  });
  assert.equal(result.ok, false);
  assert.equal(mutatedId, null);
});

test("duplicate normalized serial returns controlled 409 without mutation", async () => {
  let mutations = 0;
  const result = await registerResolvedPass("RVSN-500", "id-a", registration, {
    resolveSerial: async () => ({ state: "ambiguous" }),
    registerById: async () => { mutations += 1; return { state: "not_found" }; },
  });
  assert.deepEqual(result, { ok: false, status: 409, error: "Pass serial is ambiguous." });
  assert.equal(mutations, 0);
});

test("only the exact UUID selected by the server is mutated", async () => {
  let mutatedId: string | null = null;
  const selected = pass("server-selected-id");
  const result = await registerResolvedPass("0500", selected.id, registration, {
    resolveSerial: async () => ({ state: "found", pass: selected }),
    registerById: async (_normalized, id) => { mutatedId = id; return { state: "registered", pass: selected, changed: true }; },
  });
  assert.equal(result.ok, true);
  assert.equal(mutatedId, "server-selected-id");
});

test("a duplicate introduced after resolution is rejected under the mutation lock", async () => {
  const selected = pass("id-a");
  const result = await registerResolvedPass("0500", selected.id, registration, {
    resolveSerial: async () => ({ state: "found", pass: selected }),
    registerById: async () => ({ state: "ambiguous" }),
  });
  assert.deepEqual(result, { ok: false, status: 409, error: "Pass serial is ambiguous." });
});
