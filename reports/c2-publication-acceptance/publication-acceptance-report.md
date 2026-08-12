# C2 Publication Acceptance Report

## Browser Acceptance Result

- Authoritative backlog: 588 records.
- `TERRA_FINAL`: 577; all passed manifest identity/status/headline/article-reference validation.
- `BOB_REVIEW_REQUIRED`: 11; none are eligible for the authoritative public overlay.
- Shared renderer integration: complete in source.
- Automated manifest validation: PASS.
- Runtime validation: PARTIAL — representative browser proof completed; live/current-song proof remains separate.
- 25 representative `TERRA_FINAL` VDJ routes: HTTP 200 and article content rendered.
- Canonical routes: `/retroverse-2/song/RVTR111098` and `/retroverse-2/song/RVTR251916` rendered; Chart Journey and artist-labelled Related Music were verified on the first route, and one Related Music destination resolved.
- Review exceptions: three tested; all remained fallback-only with no approved Terra feature article.
- Ask Arvey: exactly one accessible control on tested experiences.
- Console/network: no errors or failed requests observed.
- Horizontal overflow: none observed in tested layouts.
- Visual/responsive evidence: captured at 375px, 390px, 430px, and desktop.
- Canonical Terra overlay proof: BLOCKED. The authoritative C2 manifest has zero canonical RVTR identities, so three canonical TERRA_FINAL subjects cannot be selected without a new crosswalk.
- Live/current-song integration proof: BLOCKED. `loadPublicCurrentSongPayload()` is the existing resolver, but the homepage live path renders `LiveSongView`, not `PublicSongExperience`; no safe fixture exists for the requested shared-renderer proof.
- Deployment: none.

## Recommendation

**MODIFY BEFORE DEPLOYMENT.** The remaining two gates are blocked by source/architecture facts, not by an untested browser click: the C2 manifest has no canonical identities, and the current homepage live renderer is separate from `PublicSongExperience`. Do not deploy until an approved crosswalk/fixture or scoped architecture decision resolves those gaps.

## Defect and Fix

The loader now honors each record's `articleReference.source` and matches proof-manifest articles by durable identity or subject. This restored valid proof-backed `TERRA_FINAL` articles without changing editorial content or route architecture.
