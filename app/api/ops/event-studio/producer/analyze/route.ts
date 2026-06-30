import { NextResponse } from "next/server";

import { analyzeEventDescription } from "@/lib/ops/event-studio/producer/analyze";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as { sourceText?: string };
    const result = await analyzeEventDescription(body.sourceText ?? "");

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.code === "empty_input" ? 400 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      model: result.model,
      parsedPlan: result.parsedPlan,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analyze failed";
    return NextResponse.json({ ok: false, error: message, code: "ollama_unavailable" }, { status: 500 });
  }
}
