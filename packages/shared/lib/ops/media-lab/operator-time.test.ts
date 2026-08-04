import test from "node:test";
import assert from "node:assert/strict";
import { formatOperatorTime, formatTrimPrecision } from "./operator-time";

test("formats operator times in readable broad units", () => {
  assert.equal(formatOperatorTime(5), "00:05");
  assert.equal(formatOperatorTime(305), "05:05");
  assert.equal(formatOperatorTime(3600), "1:00:00");
  assert.equal(formatOperatorTime(3825), "1:03:45");
});
test("rounds at visible half-second boundaries", () => {
  assert.equal(formatOperatorTime(59.5), "01:00");
  assert.equal(formatOperatorTime(3599.5), "1:00:00");
  assert.equal(formatOperatorTime(Number.NaN), "—:—");
});
test("keeps hundredths only for trim precision", () => assert.equal(formatTrimPrecision(65.432), "01:05.43"));
