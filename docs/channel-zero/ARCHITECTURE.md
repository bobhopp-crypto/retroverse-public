# Channel Zero — Core Resolver (V1)

Channel Zero is Retroverse's station brain. It answers one question:

**What should the audience experience right now?**

It resolves exactly one canonical Experience (`experienceType` + `experienceId`) and does not render pages or own content.

## Priority

1. **Takeover** — VirtualDJ takeover active with a fresh matched RVTR
2. **Live Signal** — Fresh VirtualDJ bridge with a matched RVTR
3. **Scheduled Experience** — Built-in Top 10 Songs of 1969 (20s per song, loops)
4. **Default Broadcast** — Deterministic recommendation RVTR (fallback tier)

## Output contract

`resolveChannelExperience()` returns:

- `experienceType`, `experienceId`, `source`, `reason`, `selectedAt`, `validUntil`, `metadata`

## Public consumption

`loadPublicCurrentSongPayload()` calls Channel Zero and maps the result to the existing Public V3 homepage payload (`/api/sunday-nights/current`, `/`).

## Non-goals (V1)

- No scheduling editor, workers, cron, or browser timers
- No new experience types (countdown is metadata only)
- No `/ops` coupling
