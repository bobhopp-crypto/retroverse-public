# Canonical Terra Overlay Proof

## Result: BLOCKED — source set does not contain canonical identities

The authoritative source `data/ops/manifest/c2-final-editor-backlog.json` contains 588 records, but all 588 durable identities are `VDJ:<key>` values. A read-only inspection found **zero** `RVTR######` identities or canonical RVTR fields in the manifest. Therefore three canonical `TERRA_FINAL` subjects cannot be selected from this authoritative C2 source without inventing a crosswalk or changing canonical matching.

The canonical browser route `/retroverse-2/song/RVTR111098` was loaded successfully and retained its existing Chart Journey, Related Music, navigation, hero, and single Ask Arvey behavior. Its article is the existing canonical/local editorial record, but it cannot be asserted to be a C2 authoritative Terra overlay because `RVTR111098` is absent from the C2 manifest.

## Exact source-resolution proof available

The VDJ proof route `VDJ:54eaeb091e524d3b` resolved the exact record:

- durable identity: `VDJ:54eaeb091e524d3b`
- subject: Glenn Miller — Chattanooga Choo Choo (1941)
- headline: `From Sun Valley Serenade to a Gold Record: Glenn Miller’s ‘Chattanooga Choo Choo’`
- source: `reports/c2-terra-editor-proof-25/terra-editor-manifest.json`
- matching rule: durable identity or normalized subject

This proves the loader fix, but it is VDJ-only, not canonical. The browser route rendered the exact headline and article text from that referenced source.

## Deployment-gate conclusion

Gate A cannot pass from the current authoritative manifest. A canonical-to-VDJ crosswalk or canonical identities in the publication manifest is required before three canonical Terra overlays can be proven. No such crosswalk was created in this acceptance sprint.
