import assert from "node:assert/strict";
import test from "node:test";
import { projectArtistProfile, resolveArtistCredit, validateArtistProfileView } from "./artist-profile-contract";

const base = {
  schemaVersion: 1,
  status: "complete",
  rvar: "RVAR000123",
  name: "Prince",
  aliases: ["Prince & The Revolution", "Prince and the Revolution"],
  updatedAt: "2026-09-27T22:00:00Z",
};

test("completed rich profile projects public fields and strips internal research", () => {
  const view = projectArtistProfile({
    ...base,
    summary: "A concise artist story.",
    story: ["A deeper chapter."],
    videos: [{ videoKey: "a".repeat(24), title: "Live in 1985", kind: "Live performance" }],
    albums: [{ rval: "RVAL000001", title: "Purple Rain", year: 1984 }],
    songs: [{ rvtr: "RVTR000001", title: "When Doves Cry" }],
    chronology: [{ year: 1984, text: "A pivotal year." }],
    density: 99,
    evidenceRefs: ["/Users/bobhopp/private"],
  });
  assert.equal(view?.videos.length, 1);
  assert.equal(view?.albums.length, 1);
  assert.equal(view?.songs.length, 1);
  assert.equal(view?.chronology.length, 1);
  assert.equal("density" in view!, false);
  assert.equal("evidenceRefs" in view!, false);
  assert.deepEqual(validateArtistProfileView(view), view);
});

test("sparse profile and later update use the same artist identity", () => {
  const first = projectArtistProfile(base);
  const improved = projectArtistProfile({ ...base, updatedAt: "2026-09-28T10:00:00Z", summary: "New research." });
  assert.equal(first?.rvar, improved?.rvar);
  assert.equal(first?.summary, null);
  assert.equal(improved?.summary, "New research.");
});

test("large video and album collections stay bounded while retaining live context", () => {
  const view = projectArtistProfile({
    ...base,
    videos: Array.from({ length: 40 }, (_, index) => ({
      videoKey: index.toString(16).padStart(24, "0"),
      title: `Performance ${index}`,
      kind: index === 0 ? "Live performance" : "Music video",
      note: index === 0 ? "The exact concert performance." : null,
    })),
    albums: Array.from({ length: 30 }, (_, index) => ({
      rval: `RVAL${String(index).padStart(6, "0")}`,
      title: `Album ${index}`,
    })),
  });
  assert.equal(view?.videos.length, 30);
  assert.equal(view?.albums.length, 24);
  assert.equal(view?.videos[0]?.kind, "Live performance");
  assert.equal(view?.videos[0]?.note, "The exact concert performance.");
});

test("incomplete, mismatched, private, or invalid material stays unpublished", () => {
  assert.equal(projectArtistProfile({ ...base, status: "draft" }), null);
  assert.equal(projectArtistProfile({ ...base, rvar: "Prince" }), null);
  assert.equal(projectArtistProfile({ ...base, name: "/Users/bobhopp/private" }), null);
  assert.equal(projectArtistProfile({ ...base, updatedAt: "not a date" }), null);
});

test("verified aliases resolve, while ambiguous collaborations fall back", () => {
  const prince = { rvar: "RVAR000123", name: "Prince", aliases: ["Prince & The Revolution"] };
  assert.equal(resolveArtistCredit("Prince and The Revolution", [prince]), null);
  assert.equal(resolveArtistCredit("Prince & The Revolution", [prince]), prince.rvar);
  assert.equal(resolveArtistCredit("Prince", [prince, { rvar: "RVAR000124", name: "Prince", aliases: [] }]), null);
  assert.equal(resolveArtistCredit("Prince feat. Sheila E.", [prince]), null);
});
