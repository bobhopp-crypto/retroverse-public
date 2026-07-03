import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname } from "path";

import {
  bundledPublicExhibitPath,
  publicExhibitPath,
} from "@/lib/ops/intelligence/paths";

import type { PublicExhibit } from "./public-exhibit-types";

export async function loadPublicExhibit(rvtr: string): Promise<PublicExhibit | null> {
  const id = rvtr.trim().toUpperCase();
  for (const path of [publicExhibitPath(id), bundledPublicExhibitPath(id)]) {
    try {
      const raw = await readFile(path, "utf8");
      const parsed = JSON.parse(raw) as PublicExhibit;
      if (parsed.version !== 1 || parsed.rvtr !== id) continue;
      return parsed;
    } catch {
      /* try next location */
    }
  }
  return null;
}

export async function savePublicExhibit(exhibit: PublicExhibit): Promise<PublicExhibit> {
  const path = publicExhibitPath(exhibit.rvtr);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(exhibit, null, 2)}\n`, "utf8");
  return exhibit;
}
