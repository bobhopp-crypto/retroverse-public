import "server-only";

import { access } from "fs/promises";

import {
  departmentInputArtifacts,
  departmentOutputArtifacts,
  type StudioContractDepartmentId,
} from "@/lib/studio/contract";
import { packageArtifactPath, type PackageArtifactKind } from "@/lib/studio/package";

export async function artifactExists(rvtr: string, kind: PackageArtifactKind): Promise<boolean> {
  try {
    await access(packageArtifactPath(rvtr, kind));
    return true;
  } catch {
    return false;
  }
}

export async function artifactStatusForKinds(
  rvtr: string,
  kinds: PackageArtifactKind[],
): Promise<Partial<Record<PackageArtifactKind, boolean>>> {
  const entries = await Promise.all(
    kinds.map(async (kind) => [kind, await artifactExists(rvtr, kind)] as const),
  );
  return Object.fromEntries(entries) as Partial<Record<PackageArtifactKind, boolean>>;
}

export async function departmentArtifactStatus(
  rvtr: string,
  departmentId: StudioContractDepartmentId,
): Promise<Partial<Record<PackageArtifactKind, boolean>>> {
  const kinds = [
    ...new Set([
      ...departmentInputArtifacts(departmentId),
      ...departmentOutputArtifacts(departmentId),
    ]),
  ];
  return artifactStatusForKinds(rvtr, kinds);
}

export function allArtifactsPresent(
  artifacts: Partial<Record<PackageArtifactKind, boolean>>,
  required: PackageArtifactKind[],
): boolean {
  return required.every((kind) => artifacts[kind] === true);
}
