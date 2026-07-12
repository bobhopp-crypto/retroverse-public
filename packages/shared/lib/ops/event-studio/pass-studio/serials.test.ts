import assert from "node:assert/strict";
import test from "node:test";

import type { GeneratedPass, PassRegistration } from "./types";
import {
  applyRegistrationById,
  normalizePassSerial,
  passMatchesNormalizedSerial,
  resolveExactPass,
} from "./serials";

test("normalizes current and legacy public pass serial variants", () => {
  for (const input of ["RVSN500", "rvsn500", "RVSN-500", "500", "  RVSN500  "]) {
    assert.deepEqual(normalizePassSerial(input), {
      number: 500,
      candidates: ["RVSN500", "RVSN00500", "RVSN000500"],
    });
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

function pass(id: string, batchId: string, status: GeneratedPass["status"] = "available"): GeneratedPass {
  return {
    id,
    serial: "0500",
    serialNumber: 500,
    batchId,
    eventId: `event-${batchId}`,
    eventName: "Fixture",
    venue: "Fixture",
    date: "2026-07-12",
    passType: "General",
    templateId: "template",
    generationId: null,
    front: { artworkUrl: null },
    back: { artworkUrl: null },
    qr: { url: "https://retroverse.live/pass/0500", svg: "" },
    status,
    registration: status === "registered" ? registration("Original") : null,
    createdAt: "2026-07-12T00:00:00.000Z",
  };
}

function registration(firstName: string): PassRegistration {
  return {
    firstName,
    lastName: "",
    email: "",
    phone: "",
    city: "",
    notes: "",
    giveawayOptIn: false,
    registeredAt: "2026-07-12T00:00:00.000Z",
  };
}

test("duplicate numeric identities across batches are ambiguous", () => {
  const normalized = normalizePassSerial("RVSN500")!;
  assert.deepEqual(resolveExactPass([pass("id-a", "batch-a"), pass("id-b", "batch-b")], normalized), {
    state: "ambiguous",
  });
});

test("registration mutates only the selected immutable credential id", () => {
  const records = [pass("id-a", "batch-a"), { ...pass("id-b", "batch-b"), serialNumber: 501 }];
  const result = applyRegistrationById(records, "id-a", registration("Pat"));
  assert.ok(result);
  assert.equal(result.pass.id, "id-a");
  assert.equal(result.passes[0]!.registration?.firstName, "Pat");
  assert.equal(result.passes[1], records[1]);
});

test("already-registered exact credential is returned unchanged", () => {
  const records = [pass("id-a", "batch-a", "registered")];
  const result = applyRegistrationById(records, "id-a", registration("Replacement"));
  assert.ok(result);
  assert.equal(result.passes, records);
  assert.equal(result.pass.registration?.firstName, "Original");
});
