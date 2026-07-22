import assert from "node:assert/strict";
import test from "node:test";

import { formatRetroverseSerial } from "./serials";

test("Retroverse production serials use the canonical public format", () => {
  assert.equal(formatRetroverseSerial(163), "RVSN000163");
  assert.equal(formatRetroverseSerial(1), "RVSN000001");
});
