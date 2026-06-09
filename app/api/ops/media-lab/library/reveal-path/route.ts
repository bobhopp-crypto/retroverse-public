import { NextResponse } from "next/server";
import { resolve } from "path";

import { openInFinder } from "@/lib/ops/media-lab/open-local";
import { msVdjExportDir } from "@/lib/ops/media-collections/midnight-special/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  if (process.env.RETROVERSE_OPS !== "1") {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  let body: { path?: string };
  try {
    body = (await req.json()) as { path?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const filePath = body.path?.trim();
  if (!filePath) {
    return NextResponse.json({ ok: false, error: "path_required" }, { status: 400 });
  }

  const exportRoot = resolve(msVdjExportDir());
  const resolved = resolve(filePath);
  if (!resolved.startsWith(exportRoot)) {
    return NextResponse.json({ ok: false, error: "path_not_allowed" }, { status: 400 });
  }

  const result = await openInFinder(resolved);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, path: resolved });
}
