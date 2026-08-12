import assert from "node:assert/strict";
import test from "node:test";

import {
  RETROVERSE_STYLE_CATALOG,
  retroverseStyleById,
} from "@/lib/retroverse/style-catalog";

import {
  artworkIsCurrent,
  contextKey,
  createDefaultPreferences,
  createDraftFromPreferences,
  draftFromRecord,
  selectedArtworkIsCurrent,
} from "./model";
import { recordFromDraft, sortLibrary } from "./storage";

function artworkPair(draft: ReturnType<typeof createDraftFromPreferences>, type: "event" | "vip", id: string) {
  const key = contextKey(draft, type);
  return {
    front: {
      id: `${id}-front`,
      source: `/api/bobos/credentials/files/${id}/front.png`,
      contextKey: key,
      generatedAt: "2026-07-18T12:00:00.000Z",
      renderMode: "complete" as const,
    },
    back: {
      id: `${id}-back`,
      source: `/api/bobos/credentials/files/${id}/back.png`,
      contextKey: key,
      generatedAt: "2026-07-18T12:00:00.000Z",
      renderMode: "complete" as const,
    },
  };
}

function completeDraft() {
  const draft = createDraftFromPreferences(createDefaultPreferences());
  draft.eventName = "Eagles Bingo";
  draft.venue = "Eagles Club";
  draft.date = "2026-07-24";
  draft.eventType = "bingo";
  draft.venueType = "community-hall";
  draft.retroverseStyle = "RVBR1974";
  draft.credentialTypes = ["event", "vip"];
  draft.artwork.event = artworkPair(draft, "event", "event-one");
  draft.artwork.vip = artworkPair(draft, "vip", "vip-one");
  return draft;
}

test("new credentials use the specification defaults", () => {
  const preferences = createDefaultPreferences();
  assert.deepEqual(preferences.credentialTypes, ["event"]);
  assert.equal(preferences.eventType, "dj-night");
  assert.equal(preferences.venueType, "");
  assert.equal(preferences.retroverseStyle, "RVBR1958");
});

test("the shared Retroverse catalog exposes every official four-year style", () => {
  assert.equal(RETROVERSE_STYLE_CATALOG.length, 17);
  assert.deepEqual(
    RETROVERSE_STYLE_CATALOG.map((style) => style.id),
    [
      "RVBR1958", "RVBR1962", "RVBR1966", "RVBR1970", "RVBR1974", "RVBR1978",
      "RVBR1982", "RVBR1986", "RVBR1990", "RVBR1994", "RVBR1998", "RVBR2002",
      "RVBR2006", "RVBR2010", "RVBR2014", "RVBR2018", "RVBR2022",
    ],
  );
  assert.equal(retroverseStyleById("RVBR1982").displayName, "MTV Pop Dominance");
  assert.equal(retroverseStyleById("RVBR1982").paletteName, "Neon After Dark");
  assert.equal(retroverseStyleById("RVBR1982").identity.primaryPalette.length, 2);
});

test("artwork becomes stale whenever generated lettering or creative context changes", () => {
  const draft = completeDraft();
  const before = contextKey(draft);
  draft.date = "2026-08-24";
  draft.optionalText = "Doors at 6:30 PM";
  assert.notEqual(contextKey(draft), before);
  assert.equal(selectedArtworkIsCurrent(draft), false);

  const refreshed = completeDraft();
  const freshKey = contextKey(refreshed);
  refreshed.retroverseStyle = "RVBR1982";
  assert.notEqual(contextKey(refreshed), freshKey);
  assert.equal(artworkIsCurrent(refreshed, "event"), false);
  assert.equal(artworkIsCurrent(refreshed, "vip"), false);
});

test("each credential type can replace its own durable artwork independently", () => {
  const draft = completeDraft();
  const firstEvent = draft.artwork.event;
  const secondEvent = artworkPair(draft, "event", "event-two");
  assert.notEqual(firstEvent?.front.id, secondEvent.front.id);
  assert.equal(firstEvent?.front.contextKey, secondEvent.front.contextKey);
  assert.match(secondEvent.front.source, /^\/api\/bobos\/credentials\/files\//);
  assert.equal(draft.artwork.vip?.front.id, "vip-one-front");
});

test("saving stores only selected artwork and finishing stacks", () => {
  const draft = completeDraft();
  draft.credentialTypes = ["event"];
  const record = recordFromDraft(draft, new Date("2026-07-18T12:00:00.000Z"));
  assert.deepEqual(record.credentialTypes, ["event"]);
  assert.ok(record.artwork.event);
  assert.equal(record.artwork.vip, undefined);
  assert.ok(record.finishing.event);
  assert.equal(record.finishing.vip, undefined);

  const reopened = draftFromRecord(record);
  assert.ok(reopened.finishing.vip);
  assert.equal(reopened.artwork.vip, undefined);
});

test("saved serials persist and a duplicate receives a fresh allocation lifecycle", () => {
  const draft = completeDraft();
  draft.serials = { event: "RVSN000163", vip: "RVSN000164" };
  const record = recordFromDraft(draft);
  assert.deepEqual(record.serials, draft.serials);
  assert.deepEqual(draftFromRecord(record).serials, draft.serials);
  assert.deepEqual(draftFromRecord(record, true).serials, {});
});

test("the Library sorts by modified date newest first", () => {
  const draft = completeDraft();
  const older = recordFromDraft(draft, new Date("2026-07-17T12:00:00.000Z"));
  const newer = { ...recordFromDraft(draft, new Date("2026-07-18T12:00:00.000Z")), id: "newer" };
  assert.deepEqual(sortLibrary([older, newer]).map((record) => record.id), ["newer", older.id]);
});
