import { NextResponse } from "next/server";

import { openInFinder } from "@/lib/ops/media-lab/open-local";
import { resolveHarvestRelativePath } from "@/lib/ops/media-lab/harvest/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  let body: { relativePath?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const relativePath = body.relativePath?.trim();
  if (!relativePath) {
    return NextResponse.json({ error: "relativePath required" }, { status: 400 });
  }

  try {
    const absolutePath = resolveHarvestRelativePath(relativePath);
    const result = await openInFinder(absolutePath);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, path: absolutePath });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not open in Finder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
