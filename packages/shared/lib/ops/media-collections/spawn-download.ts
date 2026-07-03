import { spawn } from "child_process";
import { join } from "path";

export function spawnDownloadRunner(collectionId: string, limit?: number): void {
  const script = join(process.cwd(), "tools/media-collections/download-missing.ts");
  const args = ["tsx", script, collectionId];
  if (limit && limit > 0) args.push(String(limit));

  const child = spawn("npx", args, {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd(),
    env: process.env,
  });
  child.unref();
}
