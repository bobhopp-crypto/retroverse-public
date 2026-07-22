import assert from "node:assert/strict";
import test from "node:test";

import { composeHistoricalRvbrPrompt } from "./historical-rvbr-prompt-engine";
import { loadCanonRvbrProfiles } from "../retroverse/rvbr/canon-profiles";

test("the restored Credentials engine retains all eleven historical layers", () => {
  const profile = loadCanonRvbrProfiles().find((item) => item.slug === "1982-1985");
  assert.ok(profile);
  const composed = composeHistoricalRvbrPrompt({
    side: "back",
    profile,
    fields: {
      event: "Friday Night Frequencies",
      venue: "The Main Pub",
      date: "July 24, 2026",
      secondaryLine: "Doors at 8 PM",
      passTypeLabel: "VIP PASS",
      creativeNotes: "Event context: DJ Night. Neighborhood pub warmth. Official Neon After Dark palette.",
    },
    settings: {
      creativeDirection: "radio-promotion",
      avoidEraTropes: true,
      maximizeVariation: true,
      artifactArchetype: "retroverse-collectible-credential",
    },
    archetypeId: "radio-vip-pass",
    compositionSeed: 19820724,
    frontSummary: "Match the front print stock and campaign identity.",
  });

  assert.equal(Object.keys(composed.debugBreakdown).length, 11);
  for (const heading of [
    "ARTIFACT ARCHETYPE",
    "ERA STYLE",
    "RETROVERSE BRAND",
    "CREATIVE DIRECTION",
    "PHYSICAL EPHEMERA",
    "ANTI-CLICHÉ",
    "ANTI-REPETITION",
    "LAYOUT",
    "EVENT DATA",
    "RVBR ERA MANDATE",
  ]) {
    assert.match(composed.finalPrompt, new RegExp(heading));
  }
  assert.match(composed.finalPrompt, /production QR reserve/i);
  assert.match(composed.finalPrompt, /Do NOT illustrate, print, emboss, or imply any serial number/i);
  assert.doesNotMatch(composed.finalPrompt, /RVSN\d+/);
});
