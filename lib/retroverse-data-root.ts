import { existsSync } from "fs";
import { join } from "path";

/** Root of RETROVERSE_DATA (sibling repo by default). */
export function retroverseDataRoot(): string {
  const fromEnv = process.env.RETROVERSE_DATA_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sibling = join(process.cwd(), "..", "RETROVERSE_DATA");
  if (existsSync(sibling)) return sibling;
  return fromEnv || sibling;
}
