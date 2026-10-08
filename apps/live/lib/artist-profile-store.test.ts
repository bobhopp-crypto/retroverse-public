import assert from "node:assert/strict";
import { after, test } from "node:test";
import { setRedisKvForTests } from "../../../lib/sunday-nights/redis-live-state";
import { POST } from "../app/api/artist-profiles/sync/route";
import { projectArtistProfile } from "./artist-profile-contract";
import { loadArtistProfile, resolvePublishedArtistCredit } from "./artist-profile-store";

const kv = new Map<string, unknown>();
setRedisKvForTests(kv);
after(() => setRedisKvForTests(null));
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
  assert.equal((await submit({ profiles: [{ ...profile!, summary: "/Users/bobhopp/private" }] })).status, 400);
  assert.equal((await submit({ profiles: [{ ...profile!, evidenceRefs: ["private"] }] })).status, 400);
});
