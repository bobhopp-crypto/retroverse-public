/**
 * Retroverse Studio Kernel — department contracts.
 *
 * Defines inputs, outputs, owned artifacts, and dependencies per department.
 * Package payload types remain in department `package-contract.ts` modules;
 * this module holds cross-department boundaries and contract metadata only.
 */

import type { StudioKernelDepartmentId } from "./department";
import type { PackageArtifactKind } from "./package";

/** Departments with formal Studio contracts (includes infrastructure + legacy Research). */
export type StudioContractDepartmentId =
  | "collector"
  | "editor"
  | "director"
  | "publisher"
  | "research"
  | "archive"
  | "scheduler"
  | "workers";

/** Collector → Editor readiness checklist domain (UI + handoff builder). */
export type CollectorEditorHandoffDomain =
  | "identity"
  | "song"
  | "recording"
  | "performance"
  | "culture"
  | "visual_assets"
  | "relationships";

/** Collector → Editor readiness item status. */
export type CollectorEditorHandoffStatus = "Ready" | "Partial" | "Missing";

export type CollectorEditorHandoffItem = {
  id: CollectorEditorHandoffDomain;
  label: string;
  status: CollectorEditorHandoffStatus;
};

/** Collector → Editor handoff view ("Ready for Editor" checklist). */
export type CollectorEditorHandoffView = {
  title: string;
  items: CollectorEditorHandoffItem[];
};

/** @deprecated Use `CollectorEditorHandoffDomain` — alias preserved for Collector package-contract. */
export type EditorHandoffDomain = CollectorEditorHandoffDomain;

/** @deprecated Use `CollectorEditorHandoffStatus` — alias preserved for Collector package-contract. */
export type EditorHandoffStatus = CollectorEditorHandoffStatus;

/** @deprecated Use `CollectorEditorHandoffItem` — alias preserved for Collector package-contract. */
export type EditorHandoffItem = CollectorEditorHandoffItem;

/** @deprecated Use `CollectorEditorHandoffView` — alias preserved for Collector package-contract. */
export type EditorHandoffView = CollectorEditorHandoffView;

export type DepartmentContract = {
  id: StudioContractDepartmentId;
  /** Kernel department id when this contract maps to queue/worker infrastructure. */
  kernelDepartmentId: StudioKernelDepartmentId | null;
  mission: string;
  /** Artifact kinds consumed from upstream departments (public interfaces only). */
  inputs: PackageArtifactKind[];
  /** Artifact kinds produced for downstream departments. */
  outputs: PackageArtifactKind[];
  /** On-disk artifacts owned by this department under research-department/ (or intelligence/). */
  ownedArtifacts: PackageArtifactKind[];
  /** Upstream contract departments — never import their internal modules. */
  dependsOn: StudioContractDepartmentId[];
  /** Primary frozen package type name for the department output. */
  primaryOutputType: string | null;
  /** Module path for the department public interface (package-contract or kernel stub). */
  publicInterface: string;
};

export const STUDIO_DEPARTMENT_CONTRACTS: Record<
  StudioContractDepartmentId,
  DepartmentContract
> = {
  collector: {
    id: "collector",
    kernelDepartmentId: "collector",
    mission: "Gather source material and research for Studio Alpha packages.",
    inputs: [],
    outputs: ["collector"],
    ownedArtifacts: ["collector"],
    dependsOn: [],
    primaryOutputType: "CollectorPackage",
    publicInterface: "lib/ops/studio/collector/package-contract.ts",
  },
  editor: {
    id: "editor",
    kernelDepartmentId: "editor",
    mission: "Transform Collector research into editable story packages and Director handoff.",
    inputs: ["collector"],
    outputs: ["editor", "director-handoff"],
    ownedArtifacts: ["editor", "director-handoff"],
    dependsOn: ["collector"],
    primaryOutputType: "EditorStoryPackage",
    publicInterface: "lib/ops/studio/editor/package-contract.ts",
  },
  director: {
    id: "director",
    kernelDepartmentId: "director",
    mission: "Quality control, experience planning, and render readiness for patron surfaces.",
    inputs: ["director-handoff"],
    outputs: ["director", "director-render-spec"],
    ownedArtifacts: ["director", "director-render-spec"],
    dependsOn: ["editor"],
    primaryOutputType: "DirectorPackage",
    publicInterface: "lib/ops/studio/director/package-contract.ts",
  },
  publisher: {
    id: "publisher",
    kernelDepartmentId: "publisher",
    mission: "Export approved experiences to public and live surfaces.",
    inputs: ["director", "director-render-spec", "intelligence"],
    outputs: [],
    ownedArtifacts: [],
    dependsOn: ["director", "research"],
    primaryOutputType: null,
    publicInterface: "lib/ops/studio/publisher/package-contract.ts",
  },
  research: {
    id: "research",
    kernelDepartmentId: "research",
    mission: "Legacy intelligence pipeline — SongPackage fact extraction and story proposals.",
    inputs: [],
    outputs: ["intelligence"],
    ownedArtifacts: ["intelligence"],
    dependsOn: [],
    primaryOutputType: "SongPackage",
    publicInterface: "lib/ops/intelligence/song-package-types.ts",
  },
  archive: {
    id: "archive",
    kernelDepartmentId: "archive",
    mission: "On-disk layout and long-term artifact storage under research-department/.",
    inputs: [
      "collector",
      "editor",
      "director-handoff",
      "director",
      "director-render-spec",
    ],
    outputs: [
      "collector",
      "editor",
      "director-handoff",
      "director",
      "director-render-spec",
    ],
    ownedArtifacts: [
      "collector",
      "editor",
      "director-handoff",
      "director",
      "director-render-spec",
    ],
    dependsOn: [],
    primaryOutputType: "ResearchDepartmentPaths",
    publicInterface: "lib/studio/package.ts",
  },
  scheduler: {
    id: "scheduler",
    kernelDepartmentId: "scheduler",
    mission: "Route jobs between departments — no package mutation.",
    inputs: [],
    outputs: [],
    ownedArtifacts: [],
    dependsOn: [
      "collector",
      "editor",
      "director",
      "publisher",
      "research",
      "workers",
    ],
    primaryOutputType: "StudioJob",
    publicInterface: "lib/studio/job.ts",
  },
  workers: {
    id: "workers",
    kernelDepartmentId: "ai",
    mission: "Execute assigned department actions via AI or CLI backends.",
    inputs: [],
    outputs: [],
    ownedArtifacts: [],
    dependsOn: ["scheduler"],
    primaryOutputType: "StudioWorker",
    publicInterface: "lib/studio/worker.ts",
  },
};

export function getDepartmentContract(
  id: StudioContractDepartmentId,
): DepartmentContract {
  return STUDIO_DEPARTMENT_CONTRACTS[id];
}

/** Artifact kinds a department may read via public interfaces (inputs + transitive none). */
export function departmentInputArtifacts(
  id: StudioContractDepartmentId,
): PackageArtifactKind[] {
  return getDepartmentContract(id).inputs;
}

/** Artifact kinds a department produces for downstream consumers. */
export function departmentOutputArtifacts(
  id: StudioContractDepartmentId,
): PackageArtifactKind[] {
  return getDepartmentContract(id).outputs;
}
