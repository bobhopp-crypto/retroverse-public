/**
 * Retroverse Studio — department contract registry (thin kernel re-export).
 */

export type {
  StudioContractDepartmentId,
  DepartmentContract,
  CollectorEditorHandoffDomain,
  CollectorEditorHandoffStatus,
  CollectorEditorHandoffItem,
  CollectorEditorHandoffView,
  EditorHandoffDomain,
  EditorHandoffStatus,
  EditorHandoffItem,
  EditorHandoffView,
} from "@/lib/studio/contract";

export {
  STUDIO_DEPARTMENT_CONTRACTS,
  getDepartmentContract,
  departmentInputArtifacts,
  departmentOutputArtifacts,
} from "@/lib/studio/contract";
