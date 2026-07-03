import { NextResponse } from "next/server";

import { loadEditorPackagePageContext } from "@/lib/ops/studio/editor/load-library";
import { buildEditorStoryView } from "@/lib/ops/studio/editor/presentation";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

export async function GET(request: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const rvtr = new URL(request.url).searchParams.get("rvtr");
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "missing_rvtr" }, { status: 400 });
  }

  const context = await loadEditorPackagePageContext(rvtr);
  const performanceId =
    new URL(request.url).searchParams.get("performanceId") ??
    context.story?.approved.performanceId ??
    null;

  const view =
    context.collector && context.story
      ? buildEditorStoryView(context.collector, context.story, performanceId)
      : null;

  return NextResponse.json({
    ok: true,
    rvtr: context.rvtr,
    story: context.story,
    view,
    seeded: context.seeded,
  });
}
