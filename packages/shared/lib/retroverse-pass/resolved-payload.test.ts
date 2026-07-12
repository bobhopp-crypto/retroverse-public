import assert from "node:assert/strict";
import test from "node:test";

import { decodeResolvedPass, encodeResolvedPass } from "./resolved-payload";
import type { PassScanResult } from "./types";

test("resolved Postgres result renders from the first lookup payload without another lookup", () => {
  const scan: PassScanResult = {
    state: "claimed",
    pass: { serial: "RVSN00500", claimed: true, visitorId: 7, claimedAt: "2026-07-12T00:00:00.000Z" },
    visitor: { id: 7, firstName: "Pat", email: "pat@example.com", phone: null, createdAt: "2026-07-12T00:00:00.000Z" },
  };
  assert.deepEqual(decodeResolvedPass(encodeResolvedPass(scan)), scan);
});

test("malformed resolved payload is rejected without throwing", () => {
  assert.equal(decodeResolvedPass("not-valid-json"), null);
});
