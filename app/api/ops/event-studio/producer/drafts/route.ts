import { NextResponse } from "next/server";

import { createEmptyParsedPlan } from "@/lib/ops/event-studio/producer/defaults";
import { normalizeParsedPlan } from "@/lib/ops/event-studio/producer/normalize";
import { syncProducerPlanToStudio } from "@/lib/ops/event-studio/producer/sync-identity";
import {
  activateEventProducerDraft,
  listEventProducerDrafts,
  saveEventProducerDraft,
} from "@/lib/ops/event-studio/producer/store";
import { loadProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      action?: string;
      draftId?: string;
      sourceText?: string;
      model?: string;
      parsedPlan?: unknown;
      basic?: boolean;
    };

    if (body.action === "activate" && body.draftId) {
      const draft = await activateEventProducerDraft(body.draftId);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      await syncProducerPlanToStudio(draft.parsedPlan);
      const workflow = await loadProducerWorkflow();
      return NextResponse.json({ ok: true, draft, workflow });
    }

    const sourceText = body.sourceText?.trim() ?? "";
    if (!sourceText) {
      return NextResponse.json({ error: "sourceText is required" }, { status: 400 });
    }

    const parsedPlan = body.basic
      ? createEmptyParsedPlan()
      : normalizeParsedPlan(body.parsedPlan ?? createEmptyParsedPlan());

    const draft = await saveEventProducerDraft({
      sourceText,
      model: body.basic ? "none" : (body.model?.trim() ?? "none"),
      parsedPlan,
      activate: true,
    });

    if (!body.basic) {
      await syncProducerPlanToStudio(parsedPlan);
    }

    const workflow = await loadProducerWorkflow();
    return NextResponse.json({ ok: true, draft, workflow });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  try {
    const drafts = await listEventProducerDrafts();
    return NextResponse.json({ ok: true, drafts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
