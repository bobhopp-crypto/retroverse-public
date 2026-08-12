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
- Live/current-song proof: not separately verified.
- Deployment: none.

## Recommendation

**MODIFY BEFORE DEPLOYMENT.** Browser acceptance is substantially complete and one narrow manifest-source defect was fixed, but the authoritative manifest contains VDJ durable identities only, so direct canonical Terra-overlay proof and live/current-song integration remain unverified. Do not deploy until those final scope gaps are explicitly accepted or tested.

## Defect and Fix

The loader now honors each record's `articleReference.source` and matches proof-manifest articles by durable identity or subject. This restored valid proof-backed `TERRA_FINAL` articles without changing editorial content or route architecture.
