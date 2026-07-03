import "server-only";

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import { collectorVisualIdentityPath } from "./paths";
import type { CollectorVisualIdentityPackage } from "./visual-identity-types";

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function loadVisualIdentityPackage(
  rvtr: string,
): Promise<CollectorVisualIdentityPackage | null> {
  try {
    const raw = await readFile(collectorVisualIdentityPath(rvtr), "utf8");
    return JSON.parse(raw) as CollectorVisualIdentityPackage;
  } catch {
    return null;
  }
}

export async function saveVisualIdentityPackage(
  pkg: CollectorVisualIdentityPackage,
): Promise<void> {
  await writeJson(collectorVisualIdentityPath(pkg.rvtr), pkg);
}
