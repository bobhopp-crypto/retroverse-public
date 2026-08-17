import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { NextResponse } from "next/server";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const execFileAsync = promisify(execFile);
const YTDLP = "/opt/homebrew/bin/yt-dlp";

function allowedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ message: "Not available." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!allowedUrl(url)) return NextResponse.json({ message: "Paste a valid YouTube URL." }, { status: 400 });

  const output = path.join(os.homedir(), "Downloads", "%(title)s [%(id)s].%(ext)s");

  try {
    const { stdout, stderr } = await execFileAsync(
      YTDLP,
      [
        "--cookies-from-browser", "chrome",
        "--no-playlist",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]",
        "--merge-output-format", "mp4",
        "-o", output,
        "--print", "after_move:filepath",
        url,
      ],
      { timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 * 8 },
    );

    const lines = stdout.trim().split("\n").filter(Boolean);
    const savedPath = lines.at(-1);
    return NextResponse.json({ message: savedPath ? `Saved to ${savedPath}` : "Download finished." });
  } catch (error) {
    const detail = error && typeof error === "object" && "stderr" in error ? String(error.stderr) : "";
    const lastLine = detail.trim().split("\n").filter(Boolean).at(-1);
    return NextResponse.json({ message: lastLine || "Download failed. Check that Chrome is installed and signed in to YouTube." }, { status: 500 });
  }
}
