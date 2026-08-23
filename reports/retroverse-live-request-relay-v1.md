# Retroverse Live Request Relay V1

## Approved operating model

`retroverse.live` is the public request entry point. Neon is a minimal transit inbox. The Mac remains authoritative: it polls the relay, validates the active session and catalog, writes the canonical local Jukebox ledger, and rebuilds `JUKEBOX REQUESTS.m3u`. There is no ACCEPT step, moderation queue, autoplay, or playback-state queue.

Every new Jukebox session starts with **SONG REQUESTS OFF**. The Cockpit master switch opens or closes both the Mac-local iPad entry point and the public request entry point. Turning requests off does not clear the M3U. The local iPad path continues to work when the public relay or internet is unavailable.

## Network and privacy boundary

- Mac outbound origin: exact `https://retroverse.live` in production; loopback is allowed only for isolated local tests.
- Authentication: the existing `LIVE_NOW_PLAYING_SECRET`, attached server-side as a bearer header.
- Public catalog fields: artist, title, year, opaque track key, optional public hero identity, and RVTR.
- Transit fields: opaque public session, guest, request, and acknowledgement identifiers plus minimal open/closed status.
- Prohibited outbound fields: local paths, LAN hosts or addresses, BobOS details, Hammerspoon details, VirtualDJ internals, guest pass identity, and private guest details.

## Legacy pass audit

- **REUSE:** pass registration and pass history remain independent experiences.
- **HISTORY:** the old pass-bound request components and store remain as unreferenced historical source.
- **RETIRE:** old pass request APIs return `410 Gone`; old operator URLs redirect to `/bobos/jukebox`; the old accepted-request endpoint returns `410 Gone`; the pass overlay no longer renders or calls the old request workflow.
- Active legacy-pass dependencies in the guest or operator request path: **0**.

## Local verification evidence

- Live TypeScript: pass.
- Studio TypeScript: pass.
- Live optimized production build: pass.
- Studio optimized production build: blocked by the existing monolithic bundle exhausting 4 GB, 8 GB, and 12 GB Node heap limits during webpack compilation; no TypeScript or focused feature error was emitted.
- Mobile visual QA: pass at 390×844, 393×852, and 430×932 with no browser console warnings or errors.
- Isolated relay test: pass with an exact 813-video catalog, one and several requests from one guest, forced relay redelivery, stable retries, idempotent local insertion, session isolation, OFF/ON closure, unchanged M3U on OFF, and local request operation while the public origin was unavailable.
- Canonical Mac runtime data: not modified by isolated verification.
