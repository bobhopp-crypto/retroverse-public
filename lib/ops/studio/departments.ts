/**
 * Retroverse Studio — department registry (UI shell).
 * Implementation lives in `@/lib/studio/department`; re-exported here for existing imports.
 */

export type {
  StudioDepartmentId,
  StudioDepartmentPlaceholders,
  StudioDepartment,
} from "@/lib/studio/department";

export {
  STUDIO_DEPARTMENTS,
  STUDIO_ACTIVE,
  STUDIO_COMING_SOON,
  getStudioDepartment,
} from "@/lib/studio/department";
