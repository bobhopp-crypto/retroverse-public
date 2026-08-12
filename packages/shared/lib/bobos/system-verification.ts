/**
 * BobOS system-level verification registry.
 *
 * Panel VERIFIED stamps live on PanelDocumentation records.
 * This registry records whole-system closure (e.g. RV02 Pass System)
 * for Project Zero / operator reports.
 */

export type SystemVerificationStatus = "verified" | "not-verified" | "in-progress";

export type SystemVerificationRecord = {
  id: string;
  title: string;
  /** Category or program this system belongs to (e.g. RV02). */
  categoryId: string;
  status: SystemVerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  summary: string;
  features: string[];
  dependencies: string[];
  /** Panel RV IDs included in this system closure. */
  panelRvIds: string[];
  remainingWork: string[];
  documentationHref: string;
};

export const SYSTEM_VERIFICATION_REGISTRY: readonly SystemVerificationRecord[] = [
  {
    id: "RV02-PASS-SYSTEM",
    title: "RV02 Pass System",
    categoryId: "RV02",
    status: "not-verified",
    summary:
      "RV02 Pass System is not system-verified. Design Builder (RV02-03) must complete a full generate + print production package before RV02 can be closed again.",
    features: [
      "Event Hub (RV02-01)",
      "Event Producer (RV02-02)",
      "Design Builder (RV02-03)",
      "Pass Management (RV02-05)",
    ],
    dependencies: [
      "Studio ops gate",
      "Neon Postgres (RETROVERSE_PASS_PG_* / production RETROVERSE_PG_*)",
      "Live app public /pass/[serial] + /api/pass/claim (RV05-05)",
      "Production binder + Pass Studio library.json (issue path)",
      "Era Atlas canon (data/rvbr/eras-canon.json) for Design Builder eras",
    ],
    panelRvIds: ["RV02-01", "RV02-02", "RV02-03", "RV02-05"],
    remainingWork: [
      "RV02-03 Design Builder: generate and print a complete production pass package, then restore panel VERIFIED",
      "Re-verify RV02 system closure only after RV02-03 is honestly verified",
      "Event Studio integration remains outside RV02 scope",
    ],
    documentationHref: "/bobos/docs",
  },
] as const;

export function getSystemVerification(id: string): SystemVerificationRecord | null {
  return SYSTEM_VERIFICATION_REGISTRY.find((entry) => entry.id === id) ?? null;
}

export function getSystemVerificationByCategory(categoryId: string): SystemVerificationRecord | null {
  return SYSTEM_VERIFICATION_REGISTRY.find((entry) => entry.categoryId === categoryId) ?? null;
}

export function isSystemVerified(id: string): boolean {
  return getSystemVerification(id)?.status === "verified";
}
