import "server-only";

import { spawn } from "node:child_process";

import { isRunnableScript } from "@/lib/atlas/npm-script-catalog";

export type ScriptRunResult = {
  scriptName: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  startedAt: string;
  finishedAt: string;
};

let activeRun: { scriptName: string; startedAt: string } | null = null;

export function getActiveScriptRun(): { scriptName: string; startedAt: string } | null {
  return activeRun;
}

export function runNpmScript(scriptName: string): {
  ok: true;
  stream: ReadableStream<Uint8Array>;
} | {
  ok: false;
  status: number;
  error: string;
} {
  if (!isRunnableScript(scriptName)) {
    return { ok: false, status: 403, error: "Script is not on the safe run allowlist." };
  }

  if (activeRun) {
    return {
      ok: false,
      status: 409,
      error: `Already running ${activeRun.scriptName}. Wait for it to finish.`,
    };
  }

  const startedAt = new Date().toISOString();
  activeRun = { scriptName, startedAt };
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("start", { scriptName, startedAt });

      const proc = spawn("npm", ["run", scriptName], {
        cwd: process.cwd(),
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      proc.stdout?.on("data", (chunk: Buffer) => {
        send("stdout", { text: chunk.toString("utf8") });
      });

      proc.stderr?.on("data", (chunk: Buffer) => {
        send("stderr", { text: chunk.toString("utf8") });
      });

      const finish = (exitCode: number) => {
        activeRun = null;
        send("exit", {
          exitCode,
          finishedAt: new Date().toISOString(),
        });
        controller.close();
      };

      proc.on("close", (code) => finish(code ?? 1));
      proc.on("error", (error) => {
        send("error", { message: error.message });
        finish(1);
      });
    },
  });

  return { ok: true, stream };
}
