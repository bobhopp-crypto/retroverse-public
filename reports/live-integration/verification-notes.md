# Live Experience Verification Notes

Generated: 2026-06-22

## Build

- `npm run build`: passed.

## Mobile Width Checks

Viewport: 390 x 844.

- `/live`: HTTP 200. Shared Retroverse shell visible with `Press Play for the Past`, `Back to Live`, status badge, and tabs. Current local state was empty, so fallback/waiting copy appeared.
- `/sunday-nights`: HTTP 200. Shared shell appears above the existing Sunday Nights page and pass registration surface.
- `/rvtr/RVTR419089/song-sheet`: HTTP 200. Package-only scenario shows `Package` badge and Story active.
- `/rvtr/RVTR728658/deck`: HTTP 200. Deck-available scenario shows `Deck` badge and Deck active.
- `/ops/live-companion`: HTTP 200 behind ops gate with `retroverse_ops_gate=ok`. Shows patron expectation, bridge payload fields, resolution fields, VDJ label field, package/deck flags, destination, and last update.

Screenshots saved in `reports/live-integration/`:

- `live-mobile.png`
- `sunday-nights-mobile.png`
- `package-only-mobile.png`
- `deck-mobile.png`
- `companion-mobile-authed.png`

## Notes

- RVTR-only route checks using `/track/[rvtr]` rendered the existing app not-found body in this local production runtime because canonical track loading did not resolve locally. Build passed and the route remains registered as dynamic.
- Unresolved live fallback was checked through the current local `/live` empty-state path. No bridge or Sunday Nights state was mutated for testing.
- `/ops/live-companion` is protected by the existing ops middleware and shows the PIN page without the ops cookie, as expected.
