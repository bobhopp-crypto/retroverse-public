# C2 Publication Architecture Audit

The existing shared `PublicSongExperience` remains the sole public Song renderer. Canonical `/retroverse-2/song/[rvtr]` and VDJ `/song/vdj/[key]` routes both continue to use it. The publication change adds an authoritative Terra overlay before the older prototype loaders; it does not create a second renderer or change route identity.

The overlay reads the checked-in final backlog and Terra final manifest only. It publishes records with `TERRA_FINAL` and a non-empty final article. `BOB_REVIEW_REQUIRED` records fall through to existing behavior and are not published as approved articles. Existing hero resolution, Chart Journey, Related Music, Ask Arvey, canonical/VDJ-only distinctions, and fallback behavior remain owned by the existing experience.

The existing BobOS review surface at `/bobos/public-content-review` and its detail route were reused. No new review page was created under `/ops`. No deployment was performed.
