# Live C2 Connection Architecture Audit

Before this sprint, the live path was:

`VirtualDJ → bridge/state.json or Postgres live state → loadPublicCurrentSongPayload() → /api/sunday-nights/current → homepage → LiveSongView`

The prepared C2 path was:

`normalized VIDEO path → sha256(path.toLowerCase()).slice(0,16) → VDJ:<key> → loadPublicSongPayload() → authoritative Terra lookup → PublicSongExperience`

The smallest connection is the existing `vdjBaseKey()` function. The current live payload now derives `VDJ:<key>` from the exact filepath and loads the prepared public payload. The homepage renders `PublicSongExperience` only when that identity has an approved `TERRA_FINAL` record. Bob-review and unprepared tracks retain `LiveSongView` fallback behavior.

No canonical matching, fuzzy matching, RVTR allocation, XML, Label, bridge, polling, or content pipeline changes were made.
