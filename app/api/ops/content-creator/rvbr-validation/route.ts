import { NextResponse } from "next/server";

import {
  runRvbrValidation,
  rvbrValidationFileUrl,
} from "@/lib/ops/content-creator/rvbr-validation-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  try {
    const profiles = await listRvbrProfiles();
    if (!profiles.length) {
      return NextResponse.json({ error: "No RVBR profiles" }, { status: 503 });
    }

    const result = await runRvbrValidation(profiles);

    return NextResponse.json({
      ok: true,
      runId: result.runId,
      runDir: result.runDir,
      provider: result.provider,
      event: result.event,
      venue: result.venue,
      date: result.date,
      secondaryLine: result.secondaryLine,
      eras: result.eras.map((era) => ({
        ...era,
        imageUrl: rvbrValidationFileUrl(result.runId, era.filename),
      })),
      startedAt: result.startedAt,
      completedAt: result.completedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "rvbr_validation_failed";
    console.error("[rvbr-validation]", message, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
