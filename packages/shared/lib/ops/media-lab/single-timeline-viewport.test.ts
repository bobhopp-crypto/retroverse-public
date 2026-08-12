import test from "node:test";
import assert from "node:assert/strict";
import { edgeFocusViewport, fitTimeline, panViewport, viewportPositionToWorkingTime, workingTimeToViewportPosition, zoomViewport } from "./single-timeline-viewport";

test("fit and edge focus stay inside Working bounds", () => {
  assert.deepEqual(fitTimeline(100), { startWorkingSec: 0, endWorkingSec: 100 });
  assert.deepEqual(edgeFocusViewport(2, 10, 100), { startWorkingSec: 0, endWorkingSec: 10 });
});
test("zoom preserves the pointer anchor", () => {
  const view = zoomViewport({ startWorkingSec: 0, endWorkingSec: 100 }, 0.25, 2, 100);
  assert.equal(viewportPositionToWorkingTime(0.25, view), 25);
});
test("pan clamps and mapping is reversible", () => {
  const view = panViewport({ startWorkingSec: 20, endWorkingSec: 40 }, 80, 100);
  assert.deepEqual(view, { startWorkingSec: 80, endWorkingSec: 100 });
  assert.equal(workingTimeToViewportPosition(viewportPositionToWorkingTime(0.4, view), view), 0.4);
});
