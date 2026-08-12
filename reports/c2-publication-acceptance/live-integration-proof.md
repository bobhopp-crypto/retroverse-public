# Live / Current-Song Integration Proof

## Result: BLOCKED — no safe proof of the required shared renderer

The existing current-song composition point is `loadPublicCurrentSongPayload()` in `packages/shared/lib/home/public-current-song.ts`. It resolves current state and enriches matched songs through `loadPublicSongPayload()`.

However, the public homepage path in `apps/live/app/page.tsx` renders normal live songs through `apps/live/app/components/live-song-view.tsx` (`LiveSongView`). That is a separate live renderer and does not invoke `PublicSongExperience`. The current source therefore cannot prove the required chain:

`CURRENT SONG → existing resolver → shared PublicSongExperience → authoritative Terra article`

The route-level Song Experience and the current-song API use the same payload authority, but the homepage live presentation is not the shared Song renderer requested by this gate. No VDJ state, bridge state, XML, or current-song polling was changed. No simulated live update was performed.

## Safe evidence

- Existing API authority identified: `/api/sunday-nights/current` and `loadPublicCurrentSongPayload()`.
- Existing live homepage renderer identified: `LiveSongView`.
- No safe checked-in current-song fixture was found that routes a TERRA_FINAL subject through `PublicSongExperience`.
- The local dev process used for prior browser evidence was no longer serving at the time of this read-only gate check; no DJ workflow was disturbed to recreate it.

## Deployment-gate conclusion

Gate B cannot pass without either an existing safe fixture that exercises the shared renderer or an approved architectural change to make the current live presentation use `PublicSongExperience`. The latter is outside this acceptance-only sprint and was not performed.
