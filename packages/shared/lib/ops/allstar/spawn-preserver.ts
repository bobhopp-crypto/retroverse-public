import { spawn } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

type PreserveAction = "start" | "pause" | "resume" | "retry-failed";

export function spawnPreserveRunner(action: PreserveAction = "start"): void {
  const root = process.cwd();
  const venvPython = join(root, ".venv-allstar", "bin", "python");
  const python = existsSync(venvPython) ? venvPython : "python3";
  const script = join(root, "tools", "allstar-disc-extractor", "disc_extractor.py");
  const output = join(root, "tools", "allstar-disc-extractor", "output");
  const scans =
    process.env.ALLSTAR_DATA_ROOT?.trim()
      ? `${process.env.ALLSTAR_DATA_ROOT}/Scans`
      : "/Users/bobhopp/Documents/All Star Baseball/Scans";

  const args = [script, "--output", output, "--scans", scans, "--project-root", root];

  if (action === "pause") {
    args.push("--pause");
  } else if (action === "resume") {
    args.push("--resume");
  } else if (action === "retry-failed") {
    args.push("--queue", "--retry-failed");
  } else {
    args.push("--queue");
  }

  const child = spawn(python, args, {
    detached: true,
    stdio: "ignore",
    cwd: join(root, "tools", "allstar-disc-extractor"),
    env: process.env,
  });
  child.unref();
}
