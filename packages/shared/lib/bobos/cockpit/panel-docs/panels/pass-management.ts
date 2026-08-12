import type { PanelDocumentation } from "../types";

/**
 * RV02-05 — Pass Management
 * Operator admin for the public claim tables (same as “You’re in, Bob.”).
 */
export const PASS_MANAGEMENT_DOCS: PanelDocumentation = {
  panelType: "pass-management",
  rvId: "RV02-05",
  title: "Pass Management",
  subtitle: "Operator panel for retroverse_passes / retroverse_visitors claim records.",
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
    "Summary shows Total / Claimed / Unclaimed / Claimed Today from retroverse_passes.",
    "Operator searches by serial, first name, last name, or email.",
    "Selecting a row opens the detail panel: edit visitor, rename serial, reset claim, delete pass, open public page, view recent activity.",
  ],

  operatorNotes: [
    "Source of truth: Neon production retroverse_passes + retroverse_visitors (+ activity) via getPassPool().",
    "Requires RETROVERSE_PASS_PG_* (or non-local RETROVERSE_PG_*). Localhost defaults are rejected.",
    "Reset claim clears visitor_id / claimed_at and returns the pass to unclaimed so /pass/[serial] shows registration again.",
    "Delete pass requires typing the serial exactly; activity history rows are retained.",
    "library.json is Pass Production only — never used here.",
    "collector_pass_registrations is RETIRED on Neon — table retained; app code does not write it.",
    "RV02-04 Pass Registration is Retired — /bobos/pass-registration redirects here.",
  ],

  technicalArchitecture: [
    "Connection: lib/retroverse-pass/pg.ts → getPassPool() / passQuery() / passPing().",
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
    "Claim model: retroverse_passes, retroverse_visitors, retroverse_pass_activity",
    "Summary: totalPasses, claimed, unclaimed, claimedToday",
  ],

  runtimeDependencies: [
    "Postgres via lib/inspect/pg",
    "Ops gate isOpsEnabled()",
    "Live app for public /pass/[serial] verification (RV05-05)",
  ],

  verificationDetails: [
    "Status: Verified (2026-07-20) by Bob as part of RV02 Pass System closure.",
    "Operator search, member edit, serial rename, reset claim, and confirmed delete paths documented and exercised against Neon claim tables.",
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
