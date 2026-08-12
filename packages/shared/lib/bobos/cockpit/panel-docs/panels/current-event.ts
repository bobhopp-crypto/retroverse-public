import type { PanelDocumentation } from "../types";

/**
 * RV02-01 — Event Hub (Cockpit panel: Current Event)
 * Lightweight launcher: binder snapshot + links into RV02 tools.
 * Not a required workflow step — operators may deep-link Producer / Design Builder / Pass tools directly.
 */
export const CURRENT_EVENT_DOCS: PanelDocumentation = {
  panelType: "current-event",
  rvId: "RV02-01",
  title: "Event Hub",
  subtitle: "Lightweight launchpad — production binder snapshot and jumps into RV02 Event tools.",
  verification: {
    status: "verified",
    verifiedAt: "2026-07-20",
    verifiedBy: "Bob",
    notes:
      "Verified as a lightweight launcher: binder-backed context + links to Producer, Design Builder, and Pass Management. Not a required workflow gate.",
  },

  purpose:
    "Lightweight launcher: show the active production event (name, venue, date) and jump into Event Producer, Design Builder, and Pass Management. Not an obsolete heavy workflow — also not required if operators navigate directly.",

  userWorkflow: [
    "Operator opens /bobos/event (or Cockpit Current Event → Event Hub).",
    "Page loads the production binder snapshot (event name, venue, date, related modules).",
    "Operator uses hub actions to open Producer, Design Builder, or Pass Management.",
    "Shared event context stays consistent across those RV02 tools.",
  ],

  operatorNotes: [
    "Role: lightweight launcher (not a required step; not retired).",
    "Cockpit faceplate title is “Current Event”; registry / nav title is “Event Hub” (same RV02-01).",
    "Requires Studio ops gate (shouldAllowOpsRoutes).",
    "Does not own pass claim data — that is RV02-05 on Neon (public claim surface is RV05-05).",
    "Producer plan and Design Builder inventory are separate from public claim tables.",
  ],

  technicalArchitecture: [
    "Page: apps/studio/app/bobos/event/page.tsx → BobosEventHubView.",
    "Context: loadProductionBinder() from lib/ops/event-studio/production-binder.",
    "Hub actions: lib/bobos/event-hub-nav.ts (BOBOS_EVENT_HUB_ACTIONS).",
    "Cockpit panel type: current-event → primary /bobos/event.",
  ],

  sourceFiles: [
    { path: "apps/studio/app/bobos/event/page.tsx", role: "BobOS Event Hub page" },
    { path: "components/bobos/event/BobosEventHubView.tsx", role: "Hub UI" },
    { path: "lib/ops/event-studio/production-binder.ts", role: "Shared event binder" },
    { path: "lib/bobos/event-hub-nav.ts", role: "Hub action links" },
    { path: "lib/bobos/cockpit/panel-docs/panels/current-event.ts", role: "This operator documentation" },
  ],

  publicRoutes: [
    { path: "/bobos/event", role: "Event Hub (Studio, ops-gated)" },
    { path: "/bobos/producer", role: "Event Producer (RV02-02)" },
    { path: "/bobos/passes", role: "Design Builder (RV02-03)" },
    { path: "/bobos/pass-management", role: "Pass Management (RV02-05)" },
    { path: "/bobos/docs/RV02-01", role: "This operator manual" },
  ],

  apis: [],

  dataModel: [
    "Production binder snapshot (event name, venue, date, module checklist) — local ops state, not Neon claim tables.",
  ],

  runtimeDependencies: [
    "Studio app with ops routes enabled",
    "Production binder / event-studio state on disk",
  ],

  verificationDetails: [
    "Status: Verified (2026-07-20) as a lightweight launcher only.",
    "Route /bobos/event loads under ops gate.",
    "Hub actions resolve to RV02-02, RV02-03, and RV02-05 routes.",
    "RV02 verification repair: role classified as B (lightweight launcher) — keep; do not redesign; do not retire.",
  ],

  knownLimitations: [
    "Hub is a launchpad — it does not edit claim rows or print inventory.",
    "Not required — BobOS primary nav already deep-links the same destinations.",
    "Binder may be empty until an event is configured in Producer / Event Control.",
  ],

  futureEnhancements: [
    "Surface claimed-today count from Neon on the hub faceplate.",
  ],

  changeHistory: [
    {
      date: "2026-07-20",
      summary:
        "RV02 verification repair — classified as lightweight launcher (role B); kept VERIFIED for that role only; no redesign.",
    },
    {
      date: "2026-07-20",
      summary: "RV02 closure — full panel manual added; verification stamp set after Pass System verification pass.",
    },
  ],
};
