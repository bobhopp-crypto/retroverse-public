import { resolve, sep } from "path";

import { openInFinder } from "@/lib/ops/media-lab/open-local";

import { creativeLabProjectsDir, creativeLabProjectExportsDir, creativeLabProjectDir } from "./paths";

export type CreativeLabRevealTarget = "project" | "exports";

export function isAllowedCreativeLabPath(absPath: string): boolean {
  const root = resolve(creativeLabProjectsDir());
  const resolved = resolve(absPath);
  return resolved === root || resolved.startsWith(root + sep);
}

export function resolveCreativeLabRevealPath(
  projectId: string,
  target: CreativeLabRevealTarget,
): string {
  if (target === "exports") {
    return resolve(creativeLabProjectExportsDir(projectId));
  }
  return resolve(creativeLabProjectDir(projectId));
}

export async function revealCreativeLabPath(
  projectId: string,
  target: CreativeLabRevealTarget,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const path = resolveCreativeLabRevealPath(projectId, target);
  if (!isAllowedCreativeLabPath(path)) {
    return { ok: false, error: "path_not_allowed" };
  }
  const result = await openInFinder(path);
  if (!result.ok) return result;
  return { ok: true, path };
}
