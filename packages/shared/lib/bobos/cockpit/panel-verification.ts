/**
 * Cockpit panel verification — independent of runtime health.
 *
 * Health answers: "Is it running?"
 * Verification answers: "Has Bob personally confirmed that it works?"
 *
 * Source of truth for verified status is the panel documentation record
 * when present; otherwise panels default to not-verified.
 */

import { getPanelDocumentation } from "./panel-docs";
import type { PanelVerificationRecord, PanelVerificationStatus } from "./panel-docs";
import type { PanelTypeId } from "./types";

const DEFAULT_VERIFICATION: PanelVerificationRecord = {
  status: "not-verified",
};

export function getPanelVerification(panelType: PanelTypeId): PanelVerificationRecord {
  const docs = getPanelDocumentation(panelType);
  return docs?.verification ?? DEFAULT_VERIFICATION;
}

export function isPanelVerified(panelType: PanelTypeId): boolean {
  return getPanelVerification(panelType).status === "verified";
}

export function panelVerificationLabel(status: PanelVerificationStatus): string {
  return status === "verified" ? "Verified" : "Not Verified";
}
