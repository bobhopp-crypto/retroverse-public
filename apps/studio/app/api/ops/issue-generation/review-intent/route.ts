import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { resolveIssueStateDirs } from "@/lib/ops/issue-generation-monitor";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const body = (await request.json().catch(() => null)) as {
    rvtr?: string;
    intent?: "approve" | "reject";
    reason?: string;
  } | null;
  const rvtr = body?.rvtr?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || !body?.intent) {
    return NextResponse.json({ ok: false, error: "Invalid review intent." }, { status: 400 });
  }

  for (const stateDir of resolveIssueStateDirs()) {
    const path = join(stateDir, "state.json");
    if (!existsSync(path)) continue;
    try {
      const state = JSON.parse(await readFile(path, "utf8")) as {
        jobs?: Record<
          string,
          {
            rvtr?: string;
            status?: string;
            previewPath?: string;
            reviewState?: string;
            reviewReason?: string;
            updatedAt?: string;
          }
        >;
      };
      const entry = Object.entries(state.jobs ?? {}).find(([, job]) => job.rvtr?.toUpperCase() === rvtr);
      if (!entry?.[1]?.previewPath || entry[1].status !== "succeeded") continue;
      entry[1].reviewState = body.intent === "approve" ? "approved" : "rejected";
      entry[1].reviewReason = body.reason?.slice(0, 200);
      entry[1].updatedAt = new Date().toISOString();
      await writeFile(path, `${JSON.stringify(state, null, 2)}\n`);
      return NextResponse.json({ ok: true, rvtr, reviewState: entry[1].reviewState });
    } catch {
      /* try next */
    }
  }

  return NextResponse.json({ ok: false, error: "Generated output not found." }, { status: 404 });
}
