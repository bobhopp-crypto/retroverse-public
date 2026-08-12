import test from "node:test";
import assert from "node:assert/strict";
import { cutterRangeStatus, selectedRangeDuration } from "./cutter-range";

test("supports either boundary first", () => {
  assert.equal(cutterRangeStatus({ rangeInSec: null, rangeOutSec: null }, 100), "empty");
  assert.equal(cutterRangeStatus({ rangeInSec: 10, rangeOutSec: null }, 100), "in_only");
  assert.equal(cutterRangeStatus({ rangeInSec: null, rangeOutSec: 10 }, 100), "out_only");
});
test("preserves reversed state until corrected", () => {
  assert.equal(cutterRangeStatus({ rangeInSec: 20, rangeOutSec: 10 }, 100), "reversed");
  assert.equal(cutterRangeStatus({ rangeInSec: 10, rangeOutSec: 20 }, 100), "valid");
});
test("selected duration is only positive for a valid direction", () => {
  assert.equal(selectedRangeDuration({ rangeInSec: 10, rangeOutSec: 20 }), 10);
  assert.equal(selectedRangeDuration({ rangeInSec: 20, rangeOutSec: 10 }), null);
});
