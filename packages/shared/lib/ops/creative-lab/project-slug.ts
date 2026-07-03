import { existsSync } from "node:fs";
import { readdir } from "fs/promises";

import { creativeLabProjectDir } from "./paths";

export function slugifyProjectPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function baseProjectSlug(event: string, date: string): string {
  const eventPart = slugifyProjectPart(event) || "project";
  const datePart = slugifyProjectPart(date) || "undated";
  return `${eventPart}-${datePart}`.slice(0, 56);
}

export async function uniqueProjectSlug(event: string, date: string): Promise<string> {
  const base = baseProjectSlug(event, date);
  if (!existsSync(creativeLabProjectDir(base))) return base;
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`;
    if (!existsSync(creativeLabProjectDir(candidate))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function resolveProjectFolderId(projectId: string): Promise<string> {
  if (existsSync(creativeLabProjectDir(projectId))) return projectId;
  const root = creativeLabProjectDir("").replace(/\/$/, "");
  const parent = root.slice(0, root.lastIndexOf("/"));
  const dirs = await readdir(parent, { withFileTypes: true }).catch(() => []);
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    // folder id equals project id for slug-based projects
    if (d.name === projectId) return d.name;
  }
  return projectId;
}
