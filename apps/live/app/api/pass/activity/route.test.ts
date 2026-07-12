import assert from "node:assert/strict";
import test from "node:test";

import { handlePassActivity } from "@/lib/retroverse-pass/activity-handler";

test("activity database failure returns controlled 503", async () => {
  const request = new Request("https://retroverse.live/api/pass/activity", {
    method: "POST",
    body: JSON.stringify({ serial: "RVSN00500", eventType: "SEARCH" }),
  });
  const response = await handlePassActivity(request, async () => {
    throw new Error("password authentication failed for internal-db");
  });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Pass activity is temporarily unavailable." });
});
