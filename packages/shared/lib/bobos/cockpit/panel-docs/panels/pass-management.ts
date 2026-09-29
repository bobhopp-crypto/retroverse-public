import type { PanelDocumentation } from "../types";

/**
 * RV02-05 — Pass Management
 * Operator admin for the public pass and member records.
 */
export const PASS_MANAGEMENT_DOCS: PanelDocumentation = {
  panelType: "pass-management",
  rvId: "RV02-05",
  title: "Pass Management",
  subtitle: "Operator panel for public pass and member records.",
  verification: {
    status: "verified",
    verifiedAt: "2026-07-20",
    verifiedBy: "Bob",
    notes:
      "RV02 closure verification — search/edit/reset/delete against retroverse_passes / visitors confirmed for operator workflow.",
  },

  purpose:
    "Give operators one panel to search, inspect, edit, reset, and (with confirmation) delete passes from the authoritative public claim system used by Live /pass/[serial] (RV05-05).",

  userWorkflow: [
    "Guest registers via Live /pass/[serial] (RV05-05).",
    "Operator opens /bobos/pass-management.",
    "Summary shows Total / Claimed / Unclaimed / Claimed Today from the shared pass store.",
    "Operator searches by serial, first name, last name, or email.",
    "Selecting a row opens the detail panel: edit visitor, rename serial, reset claim, delete pass, open public page, view recent activity.",
  ],

  operatorNotes: [
    "Source of truth: the existing Redis store shared by public Live and local Studio.",
    "Requires LIVE_KV_REST_API_URL and LIVE_KV_REST_API_TOKEN.",
    "Reset claim clears visitor_id / claimed_at and returns the pass to unclaimed so /pass/[serial] shows registration again.",
    "Delete pass requires typing the serial exactly; activity history rows are retained.",
    "library.json is Pass Production only — never used here.",
    "Collector registration records were preserved in the shared pass store.",
    "RV02-04 Pass Registration is Retired — /bobos/pass-registration redirects here.",
  ],

  technicalArchitecture: [
    "Connection: lib/sunday-nights/redis-live-state.ts and lib/retroverse-pass/redis-status.ts.",
    "Helpers: lib/retroverse-pass/pass-management.ts (search, update visitor, rename serial, reset, delete, activity).",
    "Reuses claim edit path: updatePassVisitor() from lib/retroverse-pass/store.ts for member edits.",
    "BobOS API: GET/PATCH/DELETE /api/bobos/pass-management.",
    "BobOS UI: components/bobos/pass-management/PassManagementBoard on /bobos/pass-management.",
    "Legacy /ops/pass-management and /api/ops/pass-management are compatibility redirects/re-exports only.",
    "Optional helper API /api/bobos/pass-registration (member/assign) remains for scripts; no BobOS UI.",
  ],

  sourceFiles: [
    { path: "apps/studio/app/bobos/pass-management/page.tsx", role: "BobOS page" },
    { path: "apps/studio/app/ops/pass-management/page.tsx", role: "Legacy redirect → BobOS" },
    { path: "components/bobos/pass-management/PassManagementBoard.tsx", role: "Operator UI" },
    { path: "apps/studio/app/api/bobos/pass-management/route.ts", role: "Canonical Pass Management API" },
    { path: "apps/studio/app/api/ops/pass-management/route.ts", role: "Compatibility re-export" },
    { path: "lib/retroverse-pass/pass-management.ts", role: "Claim-model management helpers" },
    { path: "lib/retroverse-pass/store.ts", role: "Shared claim/edit primitives" },
    { path: "lib/bobos/cockpit/panel-docs/panels/pass-management.ts", role: "This operator documentation" },
  ],

  publicRoutes: [
    { path: "/bobos/pass-management", role: "BobOS Pass Management (Studio, ops-gated)" },
    { path: "/ops/pass-management", role: "Legacy redirect → /bobos/pass-management" },
    { path: "/bobos/pass-registration", role: "Retired RV02-04 redirect → /bobos/pass-management" },
    { path: "/pass/[serial]", role: "Public claim page for the same records (Live, RV05-05)" },
  ],

  apis: [
    {
      method: "GET",
      path: "/api/bobos/pass-management?q=",
      role: "List/search passes + summary",
    },
    {
      method: "GET",
      path: "/api/bobos/pass-management?serial=&activity=1",
      role: "Recent activity for one serial",
    },
    {
      method: "PATCH",
      path: "/api/bobos/pass-management",
      role: "action=member|serial|reset",
    },
    {
      method: "DELETE",
      path: "/api/bobos/pass-management",
      role: "Delete pass (confirm serial required)",
    },
  ],

  dataModel: [
    "Claim model: rv:pass:passes:v1, rv:pass:visitors:v1, rv:pass:activity:v1",
    "Summary: totalPasses, claimed, unclaimed, claimedToday",
  ],

  runtimeDependencies: [
    "Existing Redis store for pass and member state",
    "Ops gate isOpsEnabled()",
    "Live app for public /pass/[serial] verification (RV05-05)",
  ],

  verificationDetails: [
    "Status: Verified (2026-07-20) by Bob as part of RV02 Pass System closure.",
    "Operator search, member edit, serial rename, reset claim, and confirmed delete paths documented and exercised against Neon claim tables.",
    "Redis claim, duplicate, scan, edit, activity, registration, and operator actions were verified during the Neon removal cutover.",
    "Public companion is RV05-05 /pass/[serial].",
  ],

  knownLimitations: [
    "Deleting a pass does not delete the visitor row (visitors may be shared across passes).",
    "No bulk ops / analytics / import-export.",
    "Create-orphan-visitor + assign-existing-visitor helpers remain API-only (/api/bobos/pass-registration); not exposed in this UI.",
  ],

  futureEnhancements: [
    "Door-night fast serial lookup.",
    "Bulk ops / export for night-of reconciliation.",
  ],

  changeHistory: [
    {
      date: "2026-07-21",
      summary:
        "RV02-04 Pass Registration retired as a BobOS application; claim faceplate stats + docs ownership consolidated here. Public claim remains RV05-05.",
    },
    {
      date: "2026-07-20",
      summary:
        "RV02 final cleanup — UI/API owned under /bobos and /api/bobos; /ops paths are redirects/re-exports only.",
    },
    {
      date: "2026-07-20",
      summary: "RV02 closure — verification stamp set to VERIFIED after Pass System verification pass.",
    },
    {
      date: "2026-07-20",
      summary: "Moved operator page from /ops/pass-management to /bobos/pass-management; legacy /ops URL redirects.",
    },
    {
      date: "2026-07-20",
      summary:
        "Sole permanent registration management surface; collector_pass_registrations retired from app architecture.",
    },
    {
      date: "2026-07-20",
      summary:
        "Retargeted from collector_pass_registrations / library.json to retroverse_passes / retroverse_visitors.",
    },
  ],
};
