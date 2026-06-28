import { NextResponse } from "next/server";

import { refreshEditorDerivedState } from "@/lib/ops/studio/editor/editorial-brain";
import { buildEditorOfficeView } from "@/lib/ops/studio/editor/office-presentation";
import { syncApprovedFromWorkspace } from "@/lib/ops/studio/editor/normalize";
import { loadEditorPackagePageContext } from "@/lib/ops/studio/editor/load-library";
import {
  rewriteStoryFromAcceptedFacts,
  setCandidateFactStatus,
} from "@/lib/ops/studio/editor/rewrite";
import { saveDirectorHandoff, saveEditorStory } from "@/lib/ops/studio/editor/store";
import type {
  CandidateFactStatus,
  EditorEditorialStatus,
  EditorStoryPackage,
  StoryAngleId,
} from "@/lib/ops/studio/editor/types";

export const dynamic = "force-dynamic";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

type ActionBody = {
  rvtr: string;
  action:
    | "review_fact"
    | "rewrite_story"
    | "set_angle"
    | "save_story"
    | "submit_to_director"
    | "mark_ready"
    | "recall";
  factId?: string;
  factStatus?: CandidateFactStatus;
  storyAngle?: StoryAngleId;
  storyAngleCustom?: string | null;
  story?: EditorStoryPackage;
  forceRewrite?: boolean;
  notes?: string;
};

export async function POST(request: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const body = (await request.json()) as ActionBody;
  const rvtr = body.rvtr?.trim().toUpperCase();
  if (!rvtr || !body.action) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const context = await loadEditorPackagePageContext(rvtr);
  if (!context.collector || !context.story) {
    return NextResponse.json({ ok: false, error: "story_not_found" }, { status: 404 });
  }

  let next = context.story;

  if (body.action === "review_fact" && body.factId && body.factStatus) {
    next = setCandidateFactStatus(next, body.factId, body.factStatus);
    next = syncApprovedFromWorkspace(next);
    next = refreshEditorDerivedState(context.collector, next);
  } else if (body.action === "rewrite_story") {
    if (next.meta.storyManuallyEdited && !body.forceRewrite) {
      return NextResponse.json({
        ok: false,
        error: "confirm_required",
        message: "Story has manual edits. Confirm to overwrite.",
      });
    }
    const result = await rewriteStoryFromAcceptedFacts(context.collector, next);
    next = syncApprovedFromWorkspace(result.story);
  } else if (body.action === "set_angle") {
    next = {
      ...next,
      meta: {
        ...next.meta,
        storyAngle: body.storyAngle ?? next.meta.storyAngle,
        storyAngleCustom: body.storyAngleCustom ?? null,
      },
    };
    next = refreshEditorDerivedState(context.collector, next);
  } else if (body.action === "save_story" && body.story) {
    next = syncApprovedFromWorkspace({
      ...body.story,
      meta: { ...body.story.meta, rvtr },
    });
    next = refreshEditorDerivedState(context.collector, next);
  } else if (body.action === "submit_to_director") {
    next = syncApprovedFromWorkspace(next);
    next = refreshEditorDerivedState(context.collector, next);
    next = {
      ...next,
      meta: {
        ...next.meta,
        editorialStatus: "submitted",
        directorHandoff: {
          ...next.meta.directorHandoff,
          submittedAt: new Date().toISOString(),
          notes: body.notes ?? next.meta.directorHandoff.notes,
        },
      },
    };
    await saveEditorStory(next);
    await saveDirectorHandoff(next, context.collector);
    const office = buildEditorOfficeView(context.collector, next, next.approved.performanceId);
    return NextResponse.json({ ok: true, story: next, office });
  } else if (body.action === "mark_ready") {
    next = {
      ...next,
      meta: { ...next.meta, editorialStatus: "ready" as EditorEditorialStatus },
    };
  } else if (body.action === "recall") {
    next = {
      ...next,
      meta: {
        ...next.meta,
        editorialStatus: "in_progress",
        directorHandoff: { ...next.meta.directorHandoff, submittedAt: null },
      },
    };
  } else {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }

  await saveEditorStory(next);
  const office = buildEditorOfficeView(context.collector, next, next.approved.performanceId);
  return NextResponse.json({ ok: true, story: next, office });
}
