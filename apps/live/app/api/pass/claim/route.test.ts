import assert from "node:assert/strict";
import test from "node:test";

import { handlePassClaim, handlePassUpdate } from "@/lib/retroverse-pass/claim-handler";
import { PassRegistrationInputError } from "@/lib/retroverse-pass/store";

function request(serial: unknown, method = "POST") {
  return new Request("https://retroverse.live/api/pass/claim", {
    method,
    body: JSON.stringify({ serial, firstName: "Pat", email: "pat@example.com" }),
  });
}

test("registration normalizes a trimmed, mixed-case serial to canonical uppercase", async () => {
  let received = "";
  const response = await handlePassClaim(request("  rvsn000100  "), async (input) => {
    received = input.serial;
    return {
      state: "claimed",
      pass: { serial: input.serial, claimed: true, visitorId: 7, claimedAt: new Date(0).toISOString() },
      visitor: { id: 7, firstName: "Pat", email: "pat@example.com", phone: null, createdAt: new Date(0).toISOString() },
    };
  });
  assert.equal(received, "RVSN000100");
  assert.equal(response.status, 200);
});

test("empty registration credential returns 400", async () => {
  const response = await handlePassClaim(request("   "), async () => assert.fail("claim should not run"));
  assert.equal(response.status, 400);
});

test("unrecognized-format registration credential returns 400 without calling claim", async () => {
  const response = await handlePassClaim(request("EVENT-2026-0001"), async () =>
    assert.fail("claim should not run"),
  );
  assert.equal(response.status, 400);
});

test("database failure returns a private 503", async () => {
  const response = await handlePassClaim(request("RVSN000100"), async () => {
    throw new Error("password authentication failed for internal-db");
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Pass registration is temporarily unavailable." });
});

test("edit normalizes serial and returns the updated visitor", async () => {
  let received = "";
  const response = await handlePassUpdate(request("  rvsn000001  ", "PATCH"), async (input) => {
    received = input.serial;
    return {
      state: "claimed",
      pass: { serial: input.serial, claimed: true, visitorId: 1, claimedAt: new Date(0).toISOString() },
      visitor: { id: 1, firstName: input.firstName, email: input.email ?? null, phone: null, createdAt: new Date(0).toISOString() },
    };
  });
  assert.equal(received, "RVSN000001");
  assert.equal(response.status, 200);
});

test("editing an unregistered pass returns the clean input error, not a 503", async () => {
  const response = await handlePassUpdate(request("RVSN000001", "PATCH"), async () => {
    throw new PassRegistrationInputError("This pass is not registered yet.");
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "This pass is not registered yet." });
});

test("edit database failure returns a private 503", async () => {
  const response = await handlePassUpdate(request("RVSN000001", "PATCH"), async () => {
    throw new Error("password authentication failed for internal-db");
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Pass update is temporarily unavailable." });
});
