import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  listCutterJobOptions,
  normalizeCutterWorkspacePreference,
  readCutterWorkspacePreference,
  resolveActiveCutterJob,
  writeCutterWorkspacePreference,
  type CutterWorkspacePreference,
} from "@/lib/ops/media-lab/cutter-workspace-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const [preference, jobs] = await Promise.all([
      readCutterWorkspacePreference(),
      listCutterJobOptions(),
    ]);
    const activeJob = await resolveActiveCutterJob(preference, jobs);
    return NextResponse.json({
      ok: true,
      preference: { ...preference, activeJob },
      jobs,
      resumedFromPreference:
        activeJob != null &&
        preference.activeJob?.year === activeJob.year &&
        preference.activeJob?.jobSlug === activeJob.jobSlug,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not load Cutter workspace");
  }
}

export async function PUT(request: Request) {
  if (!isOpsEnabled()) return fail("Ops disabled", 403);
  try {
    const body = (await request.json()) as Partial<CutterWorkspacePreference>;
    const jobs = await listCutterJobOptions();
    const normalized = normalizeCutterWorkspacePreference({
      ...body,
      updatedAt: new Date().toISOString(),
    });
    if (
      normalized.activeJob &&
      !jobs.some(
        (job) =>
          job.year === normalized.activeJob?.year &&
          job.jobSlug === normalized.activeJob.jobSlug,
      )
    ) {
      return fail("Saved Media Lab job not found", 404);
    }
    await writeCutterWorkspacePreference(normalized);
    return NextResponse.json({ ok: true, preference: normalized });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not save Cutter workspace");
  }
}
