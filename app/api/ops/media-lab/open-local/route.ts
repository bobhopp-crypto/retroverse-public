import { NextResponse } from "next/server";

import {
  openMediaLabJobLocal,
  type MediaLabOpenTarget,
} from "@/lib/ops/media-lab/open-local";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

function parseTarget(value: unknown): MediaLabOpenTarget | null {
  if (value === "folder" || value === "chapters" || value === "labels") {
    return value;
  }
  return null;
}

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { outputDir?: string; target?: unknown };
  try {
    body = (await req.json()) as { outputDir?: string; target?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const outputDir = body.outputDir?.trim();
  const target = parseTarget(body.target);

  if (!outputDir || !target) {
    return NextResponse.json({ error: "outputDir and target required" }, { status: 400 });
  }

  const result = await openMediaLabJobLocal(outputDir, target);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, path: result.path });
}
