export type ProductionModuleId =
  | "identity"
  | "passes"
  | "poster"
  | "facebook"
  | "homepage"
  | "giveaway"
  | "registration";

export type ProductionModuleStatus =
  | "NOT_STARTED"
  | "READY"
  | "IN_PROGRESS"
  | "GENERATED"
  | "APPROVED"
  | "PUBLISHED";

export const PRODUCTION_MODULE_STATUS_ORDER: ProductionModuleStatus[] = [
  "NOT_STARTED",
  "READY",
  "IN_PROGRESS",
  "GENERATED",
  "APPROVED",
  "PUBLISHED",
];

export function productionModuleStatusLabel(status: ProductionModuleStatus): string {
  switch (status) {
    case "NOT_STARTED":
      return "Not Started";
    case "READY":
      return "Ready";
    case "IN_PROGRESS":
      return "In Progress";
    case "GENERATED":
      return "Generated";
    case "APPROVED":
      return "Approved";
    case "PUBLISHED":
      return "Published";
  }
}

export function maxProductionStatus(
  a: ProductionModuleStatus,
  b: ProductionModuleStatus,
): ProductionModuleStatus {
  return PRODUCTION_MODULE_STATUS_ORDER.indexOf(a) >= PRODUCTION_MODULE_STATUS_ORDER.indexOf(b) ? a : b;
}

export function normalizeProductionModuleStatus(raw: unknown): ProductionModuleStatus | null {
  if (
    raw === "NOT_STARTED" ||
    raw === "READY" ||
    raw === "IN_PROGRESS" ||
    raw === "GENERATED" ||
    raw === "APPROVED" ||
    raw === "PUBLISHED"
  ) {
    return raw;
  }
  return null;
}

export type ProductionModuleCard = {
  id: ProductionModuleId;
  title: string;
  status: ProductionModuleStatus;
  description: string;
  uses: string[];
  actionLabel: string;
  href: string;
  ready: boolean;
};
