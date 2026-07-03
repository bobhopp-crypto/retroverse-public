import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const CANDIDATES = ["yt-dlp", "/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp"];

let cachedBin: string | null | undefined;

export async function findYtDlp(): Promise<string | null> {
  if (cachedBin !== undefined) return cachedBin;
  for (const bin of CANDIDATES) {
    try {
      await execFileAsync(bin, ["--version"]);
      cachedBin = bin;
      return bin;
    } catch {
      // try next
    }
  }
  cachedBin = null;
  return null;
}

export function runYtDlp(
  bin: string,
  args: string[],
): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const child = spawn(bin, args, { stdio: ["ignore", "ignore", "pipe"] });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stderr });
    });
  });
}
