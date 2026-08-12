# Universal RVTR Identity Architecture Audit

## Result

**STOP before allocation.** The repository has a strong existing RVTR format and many consumers, but this audit did not find a transaction-safe allocator or a durable public-experience identity table for new `vdj_editorial` RVTRs.

## Existing contract

- RVTR format assumed throughout the public routes and data tools: `RVTR######`.
- Canonical public route: `/retroverse-2/song/[rvtr]`.
- Backward-compatible VDJ route: `/song/vdj/[key]`.
- Canonical graph relationships are read through `canonical_tracks`, chart relationships through graph/chart tables, and public pages assume an RVTR can resolve through the canonical loader.
- Physical VDJ identity remains path-derived and is represented by `VDJ:<hash>` in the C2 backlog.
- Existing VDJ-to-RVTR writeback tooling is explicitly a later XML mutation workflow; it is not a new-identity allocator and was not run.

## Missing infrastructure

No central sequence, reservation table, transaction-safe allocator, or existing `identity_type` field for prepared public experiences was found. The prior `video-completion-manifest.json` is a useful historical mapping snapshot, not a safe allocator or complete authoritative crosswalk.

Creating new RVTRs now would require choosing a collision policy and a durable catalog write boundary first. That is outside a safe read-only bounded proof.

## Architecture implications

The desired physical-video-to-RVTR relationship is compatible with the existing route contract, but a `vdj_editorial` RVTR needs a new durable record that the public loader can resolve without pretending it is a canonical chart track. The current loader and route infrastructure do not establish that record type yet.

No public route, live renderer, canonical matching, VDJ XML, bridge, or Broadcast Mixer behavior was changed.
