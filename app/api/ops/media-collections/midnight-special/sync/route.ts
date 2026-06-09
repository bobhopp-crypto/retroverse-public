import { NextResponse } from "next/server";

import { ensureMediaCollectionsInitialized } from "@/lib/ops/media-collections/init";
import {
  runMidnightSpecialSync,
  type MsSyncMode,
} from "@/lib/ops/media-collections/midnight-special/sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

function parseMode(body: { mode?: string } | null): MsSyncMode {
  const mode = body?.mode?.trim();
  if (mode === "sync-and-acquire") return "sync-and-acquire";
  if (mode === "retry-private") return "retry-private";
  return "report";
}

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { mode?: string } | null = null;
  try {
    body = (await req.json()) as { mode?: string };
  } catch {
    body = null;
  }

  await ensureMediaCollectionsInitialized();
  const report = await runMidnightSpecialSync(parseMode(body));

  if (!report.ok) {
    return NextResponse.json({ ok: false, report }, { status: 400 });
  }

  return NextResponse.json({ ok: true, report });
}
