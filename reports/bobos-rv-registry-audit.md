# BobOS RV Registry Audit

Date: 2026-07-16

## Result

The BobOS RV Registry is now the canonical source at `packages/shared/lib/bobos/rv-registry.ts`. The legacy `rv-ids.ts` file is a compatibility adapter only. The Panel Library filters its entries from registry records marked panel-eligible, and the searchable directory is available at `/bobos/rv-directory`.

## Inventory

- Registry entries: **50**
- Route-bearing page/surface entries: **45**
- Non-route entries: **5** — RV 00-00, RV 08-00, RV 10-01, RV 10-02, RV 10-11 (shared/platform surfaces; the last three are service records)
- Missing documented RV IDs: **none**
- Duplicate RV IDs: **none** in the central registry
- Duplicate route: **`/`** is shared by RV 05-01 and RV 05-06 by design; the directory makes the distinction explicit.

## Original category structure

The original definition is `docs/bobos/RV_ID_REGISTRY.md`. The existing structure is retained: RV 00 Platform, RV 01 Cockpit, RV 02 Events, RV 03 Music, RV 04 AI, RV 05 Live, RV 06 Media, RV 07 Finance, RV 08 Marketplace, RV 09 All-Star Baseball, and RV 10 Shared Services. No new categories were invented. The registry document and code previously disagreed on several entries; the code registry now includes all documented IDs, including RV 01-16/17/18 and RV 05-04/05.

## Reachability and orphan audit

- Pages with no route: the shared/service and reserved records listed above.
- Route declared but not currently present in the Studio route tree: RV 01-06 `/ops/hub`, RV 01-14 `/ops/recovery`, RV 01-15 `/ops/infrastructure`, and RV 01-16 `/ops/continuity`.
- RV 06-02 is now Graph Bridge. The existing `/ops/media-collections` surface remains untouched and requires a future RV reassignment because the prior registry label was displaced.
- Public Live routes are owned by `apps/live`; they are not treated as Studio routes. RV 05-01 through RV 05-06 remain documented public surfaces.
- Orphaned RV pages: none after registry coverage. The four route gaps above are retained as visible Experimental/Hidden inventory records instead of being silently dropped.
- Pages not assigned to a workspace: none. Every record has an explicit workspace, including reserved and shared-service entries.
- Cockpit and Panel Library membership is explicit in `panelEligible` and `cockpitEligible`; it is no longer inferred from a separate panel list.

## Cleanup recommendations

1. Resolve or retire the four RV 01 route gaps after product ownership confirms whether those pages should exist.
2. Keep `/` as a shared public route, but do not create additional duplicate route aliases.
3. When adding a BobOS page or panel, add exactly one record to `rv-registry.ts`; do not add a parallel RV entry to `rv-ids.ts` or a standalone Panel Library list.
4. Run the RV Directory as the review surface for future route and workspace audits.

## Category colors

Each RV category owns one muted accent token in `RV_CATEGORIES`. Cockpit panels resolve their accent through their registry entry, so the accent follows the category rather than the individual page.
