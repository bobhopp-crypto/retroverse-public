import { spawn } from "child_process";
import { join } from "path";

/** Detached background worker — survives page refresh / navigation. */
export function spawnContentCreatorJobRunner(): void {
  const script = join(process.cwd(), "tools/content-creator/run-jobs.ts");
  spawn("npx", ["tsx", script], {
    detached: true,
    stdio: "ignore",
    cwd: process.cwd(),
    env: process.env,
  }).unref();
}
