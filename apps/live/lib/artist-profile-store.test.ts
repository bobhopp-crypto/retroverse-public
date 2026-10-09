import assert from "node:assert/strict";
import { after, test } from "node:test";
import { setRedisKvForTests, setRedisLatencyForTests } from "../../../lib/sunday-nights/redis-live-state";
import { POST } from "../app/api/artist-profiles/sync/route";
import { ARTIST_PROFILE_REMOVAL_LIMIT, projectArtistProfile } from "./artist-profile-contract";
import { loadArtistProfile, loadArtistProfileBounded, resolvePublishedArtistCredit } from "./artist-profile-store";

const kv = new Map<string, unknown>();
setRedisKvForTests(kv);
after(() => {
  setRedisLatencyForTests(null);
  setRedisKvForTests(null);
});
process.env.LIVE_NOW_PLAYING_SECRET = "artist-profile-test-secret";

const profile = projectArtistProfile({
  schemaVersion: 1, status: "complete", rvar: "RVAR000123", name: "Prince",
  aliases: ["Prince & The Revolution"], updatedAt: "2026-09-27T00:00:00Z",
  summary: "The first public version.", story: ["A brief artist story."],
  videos: [{ videoKey: "a".repeat(24), title: "A live performance", kind: "Live performance" }],
  density: 40, evidenceRefs: ["/Users/bobhopp/private"],
});
assert.ok(profile);

const submit = (body: unknown, authorized = true) => POST(new Request("https://retroverse.live/api/artist-profiles/sync", {
  method: "POST",
  headers: authorized ? { authorization: "Bearer artist-profile-test-secret" } : {},
  body: JSON.stringify(body),
}));

test("missing profile remains a safe null fallback", async () => {
  assert.equal(await loadArtistProfile("RVAR999999"), null);
});

test("publishing and later improvement replace the same RVAR", async () => {
  assert.equal((await submit({ profiles: [profile], directory: [{ rvar: profile!.rvar, name: profile!.name, aliases: profile!.aliases }] })).status, 200);
  assert.equal((await loadArtistProfile(profile!.rvar))?.summary, "The first public version.");
  assert.equal(await resolvePublishedArtistCredit("Prince & The Revolution"), profile!.rvar);
  assert.equal(await resolvePublishedArtistCredit("Prince feat. Sheila E."), null);

  const improved = { ...profile!, updatedAt: "2026-09-28T00:00:00Z", summary: "A stronger public story." };
  assert.equal((await submit({ profiles: [improved] })).status, 200);
  assert.equal((await loadArtistProfile(profile!.rvar))?.summary, "A stronger public story.");
  assert.equal(kv.has("rv:public:artist-profile:v1:RVAR000123"), true);
});

test("unauthorized and private data are rejected", async () => {
  assert.equal((await submit({ profiles: [profile] }, false)).status, 401);
  assert.equal((await submit({ profiles: [], remove: [profile!.rvar] }, false)).status, 401);
  assert.equal((await submit({ profiles: [{ ...profile!, summary: "/Users/bobhopp/private" }] })).status, 400);
  assert.equal((await submit({ profiles: [{ ...profile!, evidenceRefs: ["private"] }] })).status, 400);
  assert.equal((await submit({ profiles: [], remove: ["Prince"] })).status, 400);
});

const entry = { rvar: profile!.rvar, name: profile!.name, aliases: profile!.aliases };

test("a removed or drafted profile is no longer served", async () => {
  assert.equal((await submit({ profiles: [profile], directory: [entry] })).status, 200);
  assert.equal((await loadArtistProfile(profile!.rvar))?.rvar, profile!.rvar);

  const removed = await submit({ profiles: [], remove: [profile!.rvar] });
  assert.equal(removed.status, 200);
  assert.deepEqual((await removed.json()).removed, [profile!.rvar]);
  assert.equal(await loadArtistProfile(profile!.rvar), null);
  assert.equal(await loadArtistProfileBounded(profile!.rvar), null);
  assert.equal(await resolvePublishedArtistCredit("Prince & The Revolution"), null);
  assert.equal(kv.has("rv:public:artist-profile:v1:RVAR000123"), false);
});

test("replacing the directory drops profiles that are no longer complete", async () => {
  const other = projectArtistProfile({
    schemaVersion: 1, status: "complete", rvar: "RVAR000124", name: "Sheila E.",
    aliases: [], updatedAt: "2026-09-27T00:00:00Z", summary: "Still complete.",
  });
  assert.ok(other);
  const sheila = { rvar: other.rvar, name: other.name, aliases: other.aliases };
  assert.equal((await submit({ profiles: [profile, other], directory: [entry, sheila] })).status, 200);

  const replaced = await submit({ profiles: [], directory: [sheila] });
  assert.equal(replaced.status, 200);
  assert.equal(await loadArtistProfile(profile!.rvar), null);
  assert.equal((await loadArtistProfile(other.rvar))?.name, "Sheila E.");
  assert.equal(await resolvePublishedArtistCredit("Prince & The Revolution"), null);
  assert.equal(await loadArtistProfileBounded(profile!.rvar), null);
  assert.equal((await loadArtistProfileBounded(other.rvar))?.rvar, other.rvar);
});

test("a slow profile lookup stays inside the page budget", async () => {
  assert.equal((await submit({ profiles: [profile], directory: [entry] })).status, 200);
  setRedisLatencyForTests(5_000);
  try {
    const started = Date.now();
    assert.equal(await loadArtistProfileBounded(profile!.rvar, 70), null);
    const elapsed = Date.now() - started;
    assert.ok(elapsed < 400, `profile lookup waited ${elapsed}ms`);
  } finally {
    setRedisLatencyForTests(null);
  }
  assert.equal((await loadArtistProfileBounded(profile!.rvar))?.summary, "The first public version.");
});

test("replacing the directory retires more artists than one remove list allows", async () => {
  const count = ARTIST_PROFILE_REMOVAL_LIMIT + 50;
  const views = Array.from({ length: count }, (_, index) => projectArtistProfile({
    schemaVersion: 1,
    status: "complete",
    rvar: `RVAR${String(700000 + index).padStart(6, "0")}`,
    name: `Retired ${index}`,
    aliases: [],
    updatedAt: "2026-09-27T00:00:00Z",
  }));
  assert.ok(views.every((view) => view));
  const profiles = views.flatMap((view) => view ? [view] : []);
  const directory = profiles.map((view) => ({ rvar: view.rvar, name: view.name, aliases: view.aliases }));
  for (let offset = 0; offset < profiles.length; offset += 20) {
    const batch = profiles.slice(offset, offset + 20);
    assert.equal((await submit({
      profiles: batch,
      directory: directory.slice(0, offset + batch.length),
    })).status, 200);
  }

  const oversized = profiles.map((view) => view.rvar);
  assert.equal((await submit({ profiles: [], remove: oversized })).status, 400);
  assert.equal((await loadArtistProfile(profiles[0]!.rvar))?.name, profiles[0]!.name);

  const replaced = await submit({ profiles: [], directory: [] });
  assert.equal(replaced.status, 200);
  const removed = (await replaced.json()).removed as string[];
  assert.ok(removed.includes(profiles[0]!.rvar));
  assert.ok(removed.includes(profiles[count - 1]!.rvar));
  assert.ok(removed.length >= count);
  assert.equal(await loadArtistProfile(profiles[0]!.rvar), null);
  assert.equal(await loadArtistProfile(profiles[count - 1]!.rvar), null);
  assert.equal(await loadArtistProfileBounded(profiles[0]!.rvar), null);
});
