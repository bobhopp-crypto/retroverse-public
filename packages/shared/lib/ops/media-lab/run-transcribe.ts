import { spawn } from "child_process";
import { existsSync } from "fs";
import { dirname, join, resolve } from "path";

import type { MediaLabJobMeta } from "./job-meta";

export type TranscribeJobResult = {
  ok: boolean;
  outputDir: string;
  jobSlug: string;
  error?: string;
  job?: MediaLabJobMeta;
};

export type { MediaLabJobMeta } from "./job-meta";

function repoRoot(): string {
  let current = resolve(process.cwd());
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(current, "tools", "media-lab", "transcribe.py"))) return current;
    current = dirname(current);
  }
  return resolve(process.cwd());
}

export function transcribeScriptPath(): string {
  return join(repoRoot(), "tools", "media-lab", "transcribe.py");
}

export async function runMediaLabTranscribe(opts: {
  videoPath: string;
  outputDir: string;
  year: number;
  jobSlug: string;
  sourceFilename: string;
  model?: string;
}): Promise<TranscribeJobResult> {
  const python = process.env.MEDIA_LAB_PYTHON?.trim() || "python3";
  const script = transcribeScriptPath();
  const model = opts.model ?? process.env.MEDIA_LAB_WHISPER_MODEL?.trim() ?? "base";

  return new Promise((resolve) => {
    const args = [
      script,
      "--video",
      opts.videoPath,
      "--output-dir",
      opts.outputDir,
      "--year",
      String(opts.year),
      "--job-slug",
      opts.jobSlug,
      "--source-filename",
      opts.sourceFilename,
      "--model",
      model,
    ];

    const proc = spawn(python, args, {
      cwd: repoRoot(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    proc.stderr.on("data", (c: Buffer) => {
      stderr += c.toString();
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          outputDir: opts.outputDir,
          jobSlug: opts.jobSlug,
          error: stderr.trim() || stdout.trim() || `transcribe exited ${code}`,
        });
        return;
      }

      try {
        const lastLine = stdout
          .trim()
          .split("\n")
          .filter(Boolean)
          .pop();
        const job = lastLine ? (JSON.parse(lastLine) as MediaLabJobMeta) : undefined;
        resolve({
          ok: true,
          outputDir: opts.outputDir,
          jobSlug: opts.jobSlug,
          job,
        });
      } catch {
        resolve({
          ok: false,
          outputDir: opts.outputDir,
          jobSlug: opts.jobSlug,
          error: "Failed to parse transcribe output",
        });
      }
    });

    proc.on("error", (err) => {
      resolve({
        ok: false,
        outputDir: opts.outputDir,
        jobSlug: opts.jobSlug,
        error: err.message,
      });
    });
  });
}
