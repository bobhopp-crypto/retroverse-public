import assert from "node:assert/strict";
import test from "node:test";

import { handlePassClaim } from "@/lib/retroverse-pass/claim-handler";

function request(serial: unknown) {
  return new Request("https://retroverse.live/api/pass/claim", {
    method: "POST",
    body: JSON.stringify({ serial, firstName: "Pat", email: "pat@example.com" }),
  });
}

test("registration preserves an opaque trimmed credential", async () => {
  let received = "";
  const response = await handlePassClaim(request("  EVENT-2026-0001  "), async (input) => {
    received = input.serial;
    return {
      state: "claimed",
      pass: { serial: input.serial, claimed: true, visitorId: 7, claimedAt: new Date(0).toISOString() },
      visitor: { id: 7, firstName: "Pat", email: "pat@example.com", phone: null, createdAt: new Date(0).toISOString() },
    };
  });
  assert.equal(received, "EVENT-2026-0001");
  assert.equal(response.status, 200);
});

test("empty registration credential returns 400", async () => {
  const response = await handlePassClaim(request("   "), async () => assert.fail("claim should not run"));
  assert.equal(response.status, 400);
});

test("database failure returns a private 503", async () => {
  const response = await handlePassClaim(request("RVSN000100"), async () => {
    throw new Error("password authentication failed for internal-db");
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Pass registration is temporarily unavailable." });
});
