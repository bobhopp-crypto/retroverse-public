import type { PanelDocumentation } from "../types";

/**
 * RV02-03 — Design Builder (Cockpit panel: Pass Production)
 * Pass artwork, serial inventory (library.json), and print production.
 */
export const PASS_PRODUCTION_DOCS: PanelDocumentation = {
  panelType: "pass-production",
  rvId: "RV02-03",
  title: "Design Builder",
  subtitle: "Pass artwork, templates, serial inventory, and print sheets for the active event.",
  verification: {
    status: "not-verified",
    notes:
      "Not verified until Bob successfully generates and prints a complete production pass package. Page load alone is insufficient.",
  },

  purpose:
    "Build and issue visual passes for an event: templates, artwork, serial allocation into Pass Studio library.json, and print-sheet layouts. This is production inventory — not the public claim database.",

  userWorkflow: [
    "Operator opens /bobos/passes (Design Builder) from Event Hub or Cockpit Pass Production.",
    "Workspace loads event context from the production binder plus templates and library inventory.",
    "Operator designs / selects General, VIP, Backstage (or custom) slots and generates artwork.",
    "Serials are allocated into the Pass Studio library for print / QR encoding.",
    "Printed or digital QR URLs point guests to Live /pass/[serial] (RV05-05) for claim.",
  ],

  operatorNotes: [
    "Cockpit faceplate title is “Pass Production”; registry / nav title is “Design Builder” (same RV02-03).",
    "library.json is Pass Production inventory only — never the public claim store.",
    "Public registration after scan is RV05-05; operator corrections are RV02-05.",
    "Default General/VIP/Backstage templates are seeded when none exist.",
    "Aliases print-queue / printer-panel may deep-link here for print workflows.",
  ],

  technicalArchitecture: [
    "Page: apps/studio/app/bobos/passes/page.tsx → PassStudioWorkspace.",
    "Server actions: apps/studio/app/bobos/passes/actions.ts.",
    "Templates / library: lib/bobos/pass-studio/store.ts.",
    "Serial helpers: lib/bobos/pass-studio/serials.ts.",
    "Project Zero layouts: lib/bobos/project-zero/pass-workspace-store.ts.",
    "Public claim after issue: Live /pass/[serial] + Neon retroverse_passes.",
  ],

  sourceFiles: [
    { path: "apps/studio/app/bobos/passes/page.tsx", role: "Design Builder page" },
    { path: "apps/studio/app/bobos/passes/actions.ts", role: "Design Builder server actions" },
    { path: "components/bobos/pass-studio/PassStudioWorkspace.tsx", role: "Pass Studio UI" },
    { path: "lib/bobos/pass-studio/store.ts", role: "Templates + library.json" },
    { path: "lib/bobos/pass-studio/serials.ts", role: "Serial allocation" },
    { path: "apps/studio/app/ops/event-studio/create/pass-generator/page.tsx", role: "Legacy redirect → /bobos/passes" },
    { path: "lib/bobos/cockpit/panel-docs/panels/pass-production.ts", role: "This operator documentation" },
  ],

  publicRoutes: [
    { path: "/bobos/passes", role: "Design Builder (Studio, ops-gated)" },
    { path: "/ops/passes", role: "Legacy redirect → /bobos/passes" },
    { path: "/ops/event-studio/create/pass-generator", role: "Legacy redirect → /bobos/passes" },
    { path: "/pass/[serial]", role: "Public claim for issued serials (Live, RV05-05)" },
    { path: "/bobos/docs/RV02-03", role: "This operator manual" },
  ],

  apis: [],

  dataModel: [
    "Pass Studio templates (local ops state)",
    "library.json — issued serial inventory for print/QR (not Neon claims)",
    "Project Zero production layouts per event project id",
  ],

  runtimeDependencies: [
    "Studio ops gate",
    "Production binder event context",
    "Local Pass Studio store / filesystem",
    "Live site for guest claim after issue",
  ],

  verificationDetails: [
    "Status: Not Verified (2026-07-20 repair) — requires a complete generate + print production pass package before VERIFIED.",
    "Route /bobos/passes loads PassStudioWorkspace with seeded templates (runtime load confirmed after rvbr profiles fix).",
    "Inventory path (library.json) remains separate from retroverse_passes claims.",
  ],

  knownLimitations: [
    "Issuing a serial into library.json does not auto-insert Neon retroverse_passes — claim tables must already contain the serial (or be seeded) for /pass/[serial] to resolve.",
    "Content Creator (RV02-16) is a related production tool, outside this panel’s VERIFIED scope.",
  ],

  futureEnhancements: [
    "One-click seed of issued serials into Neon retroverse_passes.",
  ],

  changeHistory: [
    {
      date: "2026-07-20",
      summary:
        "RV02 verification repair — removed VERIFIED until a complete production pass package is generated and printed. Root cause of /bobos/passes 500 fixed: listRvbrProfiles now reads Era Atlas canon (no missing rvbr_profiles table).",
    },
    {
      date: "2026-07-20",
      summary:
        "RV02 final cleanup — Pass Studio UI/lib/actions moved under components/bobos + lib/bobos + /bobos/passes; /ops pass-generator is redirect/re-export only.",
    },
    {
      date: "2026-07-20",
      summary: "RV02 closure — full panel manual added; verification stamp set.",
    },
  ],
};
