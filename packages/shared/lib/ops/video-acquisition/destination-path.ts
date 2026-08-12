import { access } from "fs/promises";
import { join } from "path";

import { productionVideoFilenameWithSuffix } from "./filenames";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function resolveAvailableProductionPath(input: {
  destinationDir: string;
  artist: string;
  title: string;
  ext?: string;
  maxSuffix?: number;
}): Promise<string> {
  const ext = input.ext?.replace(/^\./, "").trim() || "mp4";
  const maxSuffix = input.maxSuffix ?? 99;
  for (let suffixIndex = 0; suffixIndex <= maxSuffix; suffixIndex += 1) {
    const filename = productionVideoFilenameWithSuffix(input.artist, input.title, ext, suffixIndex);
    const fullPath = join(input.destinationDir, filename);
    if (!(await fileExists(fullPath))) return fullPath;
  }
  throw new Error("No available production filename suffix found.");
}
