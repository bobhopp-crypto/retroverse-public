import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, join, relative, resolve } from "node:path";

import { NextResponse } from "next/server";

import { resolveIssueStateDirs } from "@/lib/ops/issue-generation-monitor";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const imageTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

async function previewPathFor(rvtr: string): Promise<string | null> {
  for (const stateDir of resolveIssueStateDirs()) {
    const statePath = join(stateDir, "state.json");
    if (!existsSync(statePath)) continue;
    try {
      const state = JSON.parse(await readFile(statePath, "utf8")) as {
        jobs?: Record<string, { rvtr?: string; previewPath?: string }>;
      };
      const job = Object.values(state.jobs ?? {}).find((candidate) => candidate.rvtr?.toUpperCase() === rvtr);
      const stored = job?.previewPath;
      if (
        stored &&
        !isAbsolute(stored) &&
        /^retroverse\/[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp)$/i.test(stored)
      ) {
        return stored;
      }
    } catch {
      /* try next state dir */
    }
  }
  return null;
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const rvtr = new URL(request.url).searchParams.get("rvtr")?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr)) return new NextResponse("Not found", { status: 404 });

  const stored = await previewPathFor(rvtr);
  if (!stored) return new NextResponse("Not found", { status: 404 });

  const outputRoot = resolve(
    process.env.RETROVERSE_COMFY_OUTPUT_DIR?.trim() || "/Users/bobhopp/AI/ComfyUI/output",
  );
  try {
    const path = resolve(outputRoot, stored);
    const within = relative(outputRoot, path);
    const type = imageTypes[extname(path).toLowerCase()];
    if (within.startsWith("..") || isAbsolute(within) || !type || !existsSync(path)) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(await readFile(path), {
      headers: { "content-type": type, "cache-control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
