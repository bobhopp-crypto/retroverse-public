import { NextResponse } from "next/server";

import { updateWorkspace } from "@/lib/bobos/project-zero/store";
import type { WorkspaceStatus } from "@/lib/bobos/project-zero/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const VALID_STATUSES: WorkspaceStatus[] = ["NOT_STARTED", "NEEDS_ATTENTION", "DONE"];

type RouteContext = {
  params: Promise<{ id: string; workspaceId: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const { id, workspaceId } = await context.params;

  try {
    const body = (await req.json()) as { status?: string; notes?: string };
    const status =
      body.status && VALID_STATUSES.includes(body.status as WorkspaceStatus)
        ? (body.status as WorkspaceStatus)
        : undefined;

    const project = await updateWorkspace(id, workspaceId, { status, notes: body.notes });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
