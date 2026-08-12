/**
 * BobOS Cockpit Panel Documentation Standard
 *
 * Defined by the Cockpit (operations hub). Every BobOS panel may supply a
 * PanelDocumentation record. Future panels adopt the same structure by
 * adding a metadata file under panel-docs/panels/ and registering it.
 *
 * Verification (has Bob confirmed it works?) is independent of runtime health
 * (is it running?). See panel-verification.ts.
 */

import type { PanelTypeId } from "../types";

/** Bob personally confirmed the panel works. Independent of health lamps. */
export type PanelVerificationStatus = "verified" | "not-verified";

export type PanelDocRoute = {
  path: string;
  role: string;
};

export type PanelDocApi = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  role: string;
};

export type PanelDocSourceFile = {
  path: string;
  role: string;
};

export type PanelDocChange = {
  date: string;
  summary: string;
};

export type PanelVerificationRecord = {
  status: PanelVerificationStatus;
  /** ISO date (YYYY-MM-DD) when Bob confirmed. */
  verifiedAt?: string;
  verifiedBy?: string;
  /** What was confirmed during verification. */
  notes?: string;
};

/**
 * Operator-manual documentation for one Cockpit panel.
 * Supply metadata only — the drawer UI renders every section uniformly.
 */
export type PanelDocumentation = {
  panelType: PanelTypeId;
  rvId: string;
  title: string;
  /** Short deck under the title. */
  subtitle?: string;
  verification: PanelVerificationRecord;
  purpose: string;
  /** Ordered steps an operator or guest follows. */
  userWorkflow: string[];
  operatorNotes: string[];
  technicalArchitecture: string[];
  sourceFiles: PanelDocSourceFile[];
  publicRoutes: PanelDocRoute[];
  apis: PanelDocApi[];
  dataModel: string[];
  runtimeDependencies: string[];
  /** Expanded verification narrative (criteria, date, scope). */
  verificationDetails: string[];
  knownLimitations: string[];
  futureEnhancements: string[];
  changeHistory: PanelDocChange[];
};

/** Canonical section order for the documentation drawer. */
export const PANEL_DOC_SECTION_ORDER = [
  "purpose",
  "userWorkflow",
  "operatorNotes",
  "technicalArchitecture",
  "sourceFiles",
  "publicRoutes",
  "apis",
  "dataModel",
  "runtimeDependencies",
  "verification",
  "knownLimitations",
  "futureEnhancements",
  "changeHistory",
] as const;

export type PanelDocSectionId = (typeof PANEL_DOC_SECTION_ORDER)[number];

export const PANEL_DOC_SECTION_TITLES: Record<PanelDocSectionId, string> = {
  purpose: "Purpose",
  userWorkflow: "User Workflow",
  operatorNotes: "Operator Notes",
  technicalArchitecture: "Technical Architecture",
  sourceFiles: "Source Files",
  publicRoutes: "Public Routes",
  apis: "APIs",
  dataModel: "Data Model",
  runtimeDependencies: "Runtime Dependencies",
  verification: "Verification",
  knownLimitations: "Known Limitations",
  futureEnhancements: "Future Enhancements",
  changeHistory: "Change History",
};
