import assert from "node:assert/strict";
import test from "node:test";

import {
  beginPlayback,
  beginScrub,
  boundaryToleranceSec,
  completeClipPreview,
  decidePlaybackBoundary,
  finishScrub,
  mediaSeekMethod,
  nativeSeekTransition,
  pausePlayback,
  playerSourceHandoff,
  shouldIssueScrubSeek,
  type PlaybackControllerState,
} from "./cutter-playback";

const PAUSED_WORKING: PlaybackControllerState = {
  mode: "paused",
  resumeMode: "working",
  previewClipId: null,
  handledBoundaryKey: null,
  seekInProgress: false,
};

const remaining = [
  { sourceStartSec: 0, sourceEndSec: 10 },
  { sourceStartSec: 20, sourceEndSec: 40 },
];

test("playback modes are exclusive and paused is explicit", () => {
  const working = beginPlayback(PAUSED_WORKING, "working");
  assert.equal(working.mode, "working");
  assert.equal(working.resumeMode, "working");
  assert.equal(working.previewClipId, null);

  const preview = beginPlayback(working, "clip_preview", "clip-1");
  assert.equal(preview.mode, "clip_preview");
  assert.equal(preview.previewClipId, "clip-1");

  const paused = pausePlayback(preview);
  assert.equal(paused.mode, "paused");
  assert.equal(paused.resumeMode, "clip_preview");
});

test("native seeking clears stale Clip Preview authority", () => {
  const preview = beginPlayback(PAUSED_WORKING, "clip_preview", "clip-1");
  const paused = pausePlayback(preview);
  const afterSeek = nativeSeekTransition(paused);
  assert.deepEqual(afterSeek, {
    ...PAUSED_WORKING,
    resumeMode: "source_navigation",
  });
});

test("Source Navigation ignores Working and Clip Preview boundaries", () => {
  const decision = decidePlaybackBoundary({
    mode: "source_navigation",
    sourceTimeSec: 10,
    remainingRanges: remaining,
    previewRange: { sourceStartSec: 2, sourceEndSec: 3 },
    toleranceSec: 0.1,
    handledBoundaryKey: null,
    seekInProgress: false,
    scrubState: "idle",
  });
  assert.deepEqual(decision, { type: "none" });
});

test("Working mode skips an extracted range and continues after the join", () => {
  const decision = decidePlaybackBoundary({
    mode: "working",
    sourceTimeSec: 9.95,
    remainingRanges: remaining,
    previewRange: null,
    toleranceSec: 0.1,
    handledBoundaryKey: null,
    seekInProgress: false,
    scrubState: "idle",
  });
  assert.deepEqual(decision, {
    type: "seek",
    sourceTimeSec: 20,
    boundaryKey: "10.000000->20.000000",
  });

  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "working",
      sourceTimeSec: 20.2,
      remainingRanges: remaining,
      previewRange: null,
      toleranceSec: 0.1,
      handledBoundaryKey: "10.000000->20.000000",
      seekInProgress: false,
      scrubState: "idle",
    }),
    { type: "none" },
  );
});

test("Working final range pauses only at the final source end", () => {
  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "working",
      sourceTimeSec: 39.95,
      remainingRanges: remaining,
      previewRange: null,
      toleranceSec: 0.1,
      handledBoundaryKey: null,
      seekInProgress: false,
      scrubState: "idle",
    }),
    {
      type: "pause",
      sourceTimeSec: 40,
      reason: "working_complete",
      boundaryKey: "40.000000->END",
    },
  );
});

test("Working join guard prevents a repeated seek loop", () => {
  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "working",
      sourceTimeSec: 9.99,
      remainingRanges: remaining,
      previewRange: null,
      toleranceSec: 0.1,
      handledBoundaryKey: "10.000000->20.000000",
      seekInProgress: false,
      scrubState: "idle",
    }),
    { type: "none" },
  );
});

test("Clip Preview ignores Working skips and pauses at Out", () => {
  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "clip_preview",
      sourceTimeSec: 9.95,
      remainingRanges: remaining,
      previewRange: { sourceStartSec: 8, sourceEndSec: 12 },
      toleranceSec: 0.1,
      handledBoundaryKey: null,
      seekInProgress: false,
      scrubState: "idle",
    }),
    { type: "none" },
  );
  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "clip_preview",
      sourceTimeSec: 11.95,
      remainingRanges: remaining,
      previewRange: { sourceStartSec: 8, sourceEndSec: 12 },
      toleranceSec: 0.1,
      handledBoundaryKey: null,
      seekInProgress: false,
      scrubState: "idle",
    }),
    {
      type: "pause",
      sourceTimeSec: 12,
      reason: "clip_preview_complete",
      boundaryKey: "PREVIEW->12.000000",
    },
  );
  assert.equal(completeClipPreview(beginPlayback(PAUSED_WORKING, "clip_preview", "clip-1")).resumeMode, "working");
});

test("scrubbing suppresses all playback boundary behavior", () => {
  const scrubbing = beginScrub(PAUSED_WORKING, "working_drag");
  assert.equal(scrubbing.playback.mode, "paused");
  assert.equal(scrubbing.playback.resumeMode, "working");
  assert.deepEqual(
    decidePlaybackBoundary({
      mode: "working",
      sourceTimeSec: 9.99,
      remainingRanges: remaining,
      previewRange: null,
      toleranceSec: 0.1,
      handledBoundaryKey: null,
      seekInProgress: false,
      scrubState: scrubbing.scrubState,
    }),
    { type: "none" },
  );
  const finished = finishScrub(scrubbing.playback, "working_drag");
  assert.equal(finished.mode, "paused");
  assert.equal(finished.resumeMode, "working");
});

test("scrub seek throttling and final exact-seek policy are deterministic", () => {
  assert.equal(shouldIssueScrubSeek(null, 100, 75), true);
  assert.equal(shouldIssueScrubSeek(100, 150, 75), false);
  assert.equal(shouldIssueScrubSeek(100, 175, 75), true);
  assert.equal(mediaSeekMethod({ exact: false, fastSeekSupported: true }), "fastSeek");
  assert.equal(mediaSeekMethod({ exact: false, fastSeekSupported: false }), "currentTime");
  assert.equal(mediaSeekMethod({ exact: true, fastSeekSupported: true }), "currentTime");
});

test("two-frame boundary tolerance has a 0.1 second event-cadence floor", () => {
  assert.equal(boundaryToleranceSec(25), 0.1);
  assert.equal(boundaryToleranceSec(60), 0.1);
  assert.equal(boundaryToleranceSec(10), 0.2);
});

test("player-source handoff preserves source-time edit state", () => {
  assert.deepEqual(
    playerSourceHandoff({
      sourcePlayheadSec: 100.5,
      activeInSec: 90.25,
      selectedClipId: "clip-1",
      playback: beginPlayback(PAUSED_WORKING, "working"),
    }),
    {
      sourcePlayheadSec: 100.5,
      activeInSec: 90.25,
      selectedClipId: "clip-1",
      playback: {
        ...PAUSED_WORKING,
        resumeMode: "working",
      },
    },
  );
});
