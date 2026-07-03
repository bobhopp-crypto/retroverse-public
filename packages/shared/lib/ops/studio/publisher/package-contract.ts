/**
 * Publisher — frozen contract stub.
 *
 * Publisher consumes Director and legacy Research outputs via public interfaces.
 * Implementation surfaces live outside research-department/ artifact layout.
 */

export type { DepartmentContract, StudioContractDepartmentId } from "@/lib/studio/contract";

export {
  getDepartmentContract,
  STUDIO_DEPARTMENT_CONTRACTS,
} from "@/lib/studio/contract";
