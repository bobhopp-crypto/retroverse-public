import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

import { NextResponse } from "next/server";

import { resolveIssueStateDirs } from "@/lib/ops/issue-generation-monitor";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function contactSheetFromStateDir(stateDir: string, rvtr: string): Promise<string | null> {
  const statePath = join(stateDir, "state.json");
  if (!existsSync(statePath)) return null;
  try {
    const state = JSON.parse(await readFile(statePath, "utf8")) as {
      jobs?: Record<string, { rvtr?: string; frameSelection?: { contactSheetPath?: string } }>;
    };
    const job = Object.values(state.jobs ?? {}).find((candidate) => candidate.rvtr?.toUpperCase() === rvtr);
    const storedPath = job?.frameSelection?.contactSheetPath;
    if (!storedPath) return null;
    const path = resolve(storedPath);
    const stateRoot = resolve(stateDir);
    const pathWithinState = relative(stateRoot, path);
    if (pathWithinState.startsWith("..") || isAbsolute(pathWithinState)) return null;
    if (![".jpg", ".jpeg", ".png"].includes(extname(path).toLowerCase())) return null;
    return existsSync(path) ? path : null;
  } catch {
    return null;
  }
}

function contactSheetFromPilot(rvtr: string): string | null {
  const pilot = join(homedir(), ".retroverse", "issue-generation-ollama-overnight-2026-08-01", "tracks", rvtr, "contact-sheet.jpg");
  return existsSync(pilot) ? pilot : null;
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const rvtr = new URL(request.url).searchParams.get("rvtr")?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr)) return new NextResponse("Not found", { status: 404 });

  let path: string | null = null;
  for (const stateDir of resolveIssueStateDirs()) {
    path = await contactSheetFromStateDir(stateDir, rvtr);
    if (path) break;
  }
  if (!path) path = contactSheetFromPilot(rvtr);
  if (!path) return new NextResponse("Not found", { status: 404 });

  try {
    const bytes = await readFile(path);
    const contentType = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    return new NextResponse(bytes, {
      headers: { "content-type": contentType, "cache-control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
