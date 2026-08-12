# Universal RVTR Migration Report

## Status: NOT RUN — blocked before allocation

The 588-record migration was intentionally not performed.

| Metric | Result |
|---|---:|
| Prepared subjects | 588 |
| Existing RVTRs safely reused | 0 assigned in this sprint |
| New RVTRs created | 0 |
| `identity_type: canonical` assigned | 0 |
| `identity_type: vdj_editorial` assigned | 0 |
| Mapping conflicts/blockers | 588 require an authoritative allocation/crosswalk decision |

The prior `video-completion-manifest.json` was audited as evidence only. Its 362 RVTR references are not promoted because 9 RVTRs are duplicated across prepared paths, 2 prepared paths are absent, and the source does not provide the requested universal identity type or safe allocation semantics.

Bob-review subjects were not assigned new identities. Editorial approval remains separate and unchanged.
