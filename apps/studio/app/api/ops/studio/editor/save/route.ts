import { NextResponse } from "next/server";

import { applyStoryFieldUpdate, buildEditorStoryView } from "@/lib/ops/studio/editor/presentation";
import { loadEditorPackagePageContext } from "@/lib/ops/studio/editor/load-library";
import { saveDirectorHandoff, saveEditorStory } from "@/lib/ops/studio/editor/store";
import type { EditorEditorialStatus, EditorStoryPackage } from "@/lib/ops/studio/editor/types";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

type SaveBody = {
  rvtr: string;
  story: EditorStoryPackage;
  selectedPerformanceId?: string | null;
};

type FieldBody = {
  rvtr: string;
  fieldId: string;
  value: string;
  performanceId?: string | null;
};

type HandoffBody = {
  rvtr: string;
  action: "mark_ready" | "submit_to_director" | "recall";
  notes?: string;
  confidence?: "draft" | "review" | "ready";
};

function mapConfidenceToStatus(confidence?: string): EditorEditorialStatus | undefined {
  if (confidence === "ready") return "ready";
  if (confidence === "review") return "in_progress";
  if (confidence === "draft") return "in_progress";
  return undefined;
}

export async function POST(request: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const body = (await request.json()) as SaveBody | FieldBody | HandoffBody;
  const rvtr = body.rvtr?.trim().toUpperCase();
  if (!rvtr) {
    return NextResponse.json({ ok: false, error: "missing_rvtr" }, { status: 400 });
  }

  const context = await loadEditorPackagePageContext(rvtr);
  if (!context.collector || !context.story) {
    return NextResponse.json({ ok: false, error: "story_not_found" }, { status: 404 });
  }

  if ("story" in body && body.story) {
    const perfId =
      body.selectedPerformanceId ??
      body.story.approved.performanceId ??
      context.story.approved.performanceId;
    const next: EditorStoryPackage = {
      ...body.story,
      approved: { ...body.story.approved, performanceId: perfId ?? null },
      meta: { ...body.story.meta, rvtr },
    };
    await saveEditorStory(next);
    const view = buildEditorStoryView(context.collector, next, perfId);
    return NextResponse.json({ ok: true, story: next, view });
  }

  if ("fieldId" in body && body.fieldId) {
    const next = applyStoryFieldUpdate(
      context.story,
      body.fieldId,
      body.value ?? "",
      body.performanceId,
    );
    await saveEditorStory(next);
    const view = buildEditorStoryView(
      context.collector,
      next,
      body.performanceId ?? next.approved.performanceId,
    );
    return NextResponse.json({ ok: true, story: next, view });
  }

  if ("action" in body && body.action) {
    const next: EditorStoryPackage = {
      ...context.story,
      meta: {
        ...context.story.meta,
        directorHandoff: { ...context.story.meta.directorHandoff },
      },
    };

    const statusOverride = mapConfidenceToStatus(body.confidence);
    if (statusOverride) next.meta.editorialStatus = statusOverride;

    if (body.action === "mark_ready") {
      next.meta.editorialStatus = "ready";
      next.meta.directorHandoff.notes = body.notes ?? next.meta.directorHandoff.notes;
    } else if (body.action === "submit_to_director") {
      next.meta.editorialStatus = "submitted";
      next.meta.directorHandoff.submittedAt = new Date().toISOString();
      next.meta.directorHandoff.notes = body.notes ?? next.meta.directorHandoff.notes;
      await saveEditorStory(next);
      await saveDirectorHandoff(next, context.collector);
      const view = buildEditorStoryView(context.collector, next, next.approved.performanceId);
      return NextResponse.json({ ok: true, story: next, view });
    } else if (body.action === "recall") {
      next.meta.editorialStatus = "in_progress";
      next.meta.directorHandoff.submittedAt = null;
      next.meta.directorHandoff.notes = body.notes ?? next.meta.directorHandoff.notes;
    }

    await saveEditorStory(next);
    const view = buildEditorStoryView(context.collector, next, next.approved.performanceId);
    return NextResponse.json({ ok: true, story: next, view });
  }

  return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
}
