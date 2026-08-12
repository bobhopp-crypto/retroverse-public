import assert from "node:assert/strict";
import test from "node:test";

import { evaluateCandidateConfidence, rankCandidatesForBatch } from "./confidence-gate";
import type { VideoCandidate } from "./types";

function candidate(overrides: Partial<VideoCandidate>): VideoCandidate {
  return {
    videoId: "abc123",
    title: "Artist - Song Title (Official Music Video)",
    webpageUrl: "https://www.youtube.com/watch?v=abc123",
    thumbnailUrl: "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
    channel: "ArtistVEVO",
    durationSeconds: 240,
    uploadDate: null,
    viewCount: 1_000_000,
    availability: null,
    liveStatus: null,
    candidateType: "official_music_video",
    ...overrides,
  };
}

test("official VEVO video with matching metadata auto-selects", () => {
  const result = evaluateCandidateConfidence({
    artist: "Artist",
    title: "Song Title",
    expectedDurationSeconds: 235,
    candidate: candidate({}),
  });
  assert.equal(result.decision, "auto");
});

test("lyric video is rejected", () => {
  const result = evaluateCandidateConfidence({
    artist: "Artist",
    title: "Song Title",
    candidate: candidate({
      title: "Artist - Song Title (Lyric Video)",
      candidateType: "lyric_video",
      channel: "Fan Channel",
    }),
  });
  assert.equal(result.decision, "reject");
  assert.match(result.reasons.join(" "), /Lyric/i);
});

test("audio-only upload is rejected", () => {
  const result = evaluateCandidateConfidence({
    artist: "Artist",
    title: "Song Title",
    candidate: candidate({
      title: "Artist - Song Title (Official Audio)",
      candidateType: "audio_only_upload",
      channel: "Artist - Topic",
    }),
  });
  assert.equal(result.decision, "reject");
});

test("live performance routes to review", () => {
  const result = evaluateCandidateConfidence({
    artist: "Artist",
    title: "Song Title",
    candidate: candidate({
      title: "Artist - Song Title (Live at Wembley)",
      candidateType: "official_live_performance",
      channel: "ArtistVEVO",
    }),
  });
  assert.equal(result.decision, "review");
});

test("duration mismatch routes to review", () => {
  const result = evaluateCandidateConfidence({
    artist: "Artist",
    title: "Song Title",
    expectedDurationSeconds: 240,
    candidate: candidate({ durationSeconds: 90 }),
  });
  assert.equal(result.decision, "review");
  assert.ok(result.reasons.some((reason) => /duration/i.test(reason)));
});

test("artist mismatch is rejected", () => {
  const result = evaluateCandidateConfidence({
    artist: "Totally Different Artist",
    title: "Song Title",
    candidate: candidate({
      channel: "Random Uploads",
      title: "Someone Else - Other Song",
      candidateType: "fan_upload",
    }),
  });
  assert.equal(result.decision, "reject");
});

test("rankCandidatesForBatch prefers auto over review", () => {
  const ranked = rankCandidatesForBatch({
    artist: "Artist",
    title: "Song Title",
    candidates: [
      candidate({ videoId: "good", channel: "ArtistVEVO" }),
      candidate({
        videoId: "live",
        title: "Artist - Song Title (Live)",
        candidateType: "official_live_performance",
      }),
    ],
  });
  assert.ok(ranked.auto);
  assert.equal(ranked.auto?.candidate?.videoId, "good");
});
