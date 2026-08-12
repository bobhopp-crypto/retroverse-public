import type { PanelDocumentation } from "../types";

/**
 * RV02-02 — Event Producer
 * Production plan workspace (passes → giveaway → homepage).
 */
export const EVENT_PRODUCER_DOCS: PanelDocumentation = {
  panelType: "event-producer",
  rvId: "RV02-02",
  title: "Event Producer",
  subtitle: "Describe the show once — plan feeds passes, giveaway, and homepage modules.",
  verification: {
    status: "verified",
    verifiedAt: "2026-07-20",
    verifiedBy: "Bob",
    notes:
      "RV02 closure verification — Producer workspace loads under ops gate and remains the plan source for Sunday-style event flow.",
  },

  purpose:
    "Capture the event production plan in one place so Pass Design Builder, giveaway, and homepage modules share the same show description. Companion planning surface for the RV02 Pass System — not the claim database.",

  userWorkflow: [
    "Operator opens /bobos/producer from Event Hub or BobOS nav.",
    "Producer loads drafts and workflow status from event-studio producer store.",
    "Operator writes / updates the plan (event title, flow: Passes → Giveaway → Homepage).",
    "Downstream tools (Design Builder, homepage preview, giveaway) read shared binder / plan state.",
  ],

  operatorNotes: [
    "Ops-gated Studio route only.",
    "Legacy Event Studio shell wraps the producer panel for continuity.",
    "Does not write retroverse_passes / visitors — those remain RV02-04 / RV02-05.",
    "RV02-06 Legacy Event Tools (/ops/event-studio) is Deprecated; /ops/event-studio/producer redirects to /bobos/producer.",
  ],

  technicalArchitecture: [
    "Page: apps/studio/app/bobos/producer/page.tsx → EventStudioShell + EventProducerPanel.",
    "State: lib/ops/event-studio/producer/store.ts + workflow.ts + producer-state.ts (shared with legacy Event Studio shell).",
    "Shared event: loadProductionBinder().",
    "Cockpit panel type: event-producer (library entry; not on default Operations grid).",
  ],

  sourceFiles: [
    { path: "apps/studio/app/bobos/producer/page.tsx", role: "BobOS Producer page" },
    { path: "apps/studio/app/ops/event-studio/producer/page.tsx", role: "Legacy redirect → /bobos/producer" },
    { path: "components/ops/event-studio/producer/EventProducerPanel.tsx", role: "Producer UI (shared with Event Studio shell)" },
    { path: "lib/ops/event-studio/producer/store.ts", role: "Producer drafts store" },
    { path: "lib/ops/event-studio/producer/workflow.ts", role: "Workflow status" },
    { path: "lib/bobos/cockpit/panel-docs/panels/event-producer.ts", role: "This operator documentation" },
  ],

  publicRoutes: [
    { path: "/bobos/producer", role: "Event Producer (Studio, ops-gated)" },
    { path: "/ops/event-studio/producer", role: "Legacy redirect → /bobos/producer" },
    { path: "/bobos/event", role: "Event Hub launchpad (RV02-01)" },
    { path: "/bobos/docs/RV02-02", role: "This operator manual" },
  ],

  apis: [],

  dataModel: [
    "Producer drafts + workflow status (local ops state)",
    "Production binder snapshot shared with Event Hub / Design Builder",
  ],

  runtimeDependencies: [
    "Studio ops gate",
    "Event Studio producer store on disk",
  ],

  verificationDetails: [
    "Status: Verified (2026-07-20) as part of RV02 Pass System closure.",
    "Route /bobos/producer loads EventProducerPanel with binder context.",
  ],

  knownLimitations: [
    "Not on the default Cockpit Operations grid — open from nav, Event Hub, or panel library.",
    "Giveaway / homepage modules still live under /ops/event-studio/* paths.",
  ],

  futureEnhancements: [
    "Move remaining giveaway/homepage previews fully under /bobos/*.",
  ],

  changeHistory: [
    {
      date: "2026-07-20",
      summary: "RV02 final cleanup — /ops/event-studio/producer is redirect-only; canonical route /bobos/producer.",
    },
    {
      date: "2026-07-20",
      summary: "RV02 closure — panel type + operator manual added; verification stamp set.",
    },
  ],
};
