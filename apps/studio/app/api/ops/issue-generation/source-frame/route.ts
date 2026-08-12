import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { NextResponse } from "next/server";

import { resolveIssueStateDirs } from "@/lib/ops/issue-generation-monitor";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function firstFramePath(rvtr: string): Promise<string | null> {
  for (const stateDir of resolveIssueStateDirs()) {
    const statePath = join(stateDir, "state.json");
    if (!existsSync(statePath)) continue;
    try {
      const state = JSON.parse(await readFile(statePath, "utf8")) as {
        jobs?: Record<string, { rvtr?: string; frames?: string[] }>;
      };
      const job = Object.values(state.jobs ?? {}).find((candidate) => candidate.rvtr?.toUpperCase() === rvtr);
      const frame = job?.frames?.find((path) => existsSync(path));
      if (frame) return frame;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const rvtr = new URL(request.url).searchParams.get("rvtr")?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr)) return new NextResponse("Not found", { status: 404 });

  const path = await firstFramePath(rvtr);
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
