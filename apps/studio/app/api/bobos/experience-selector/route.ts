import { NextResponse } from "next/server";

import {
  isExperienceId,
  resolveCurrentExperience,
  selectExperience,
} from "@/lib/bobos/experience-selector";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

function forbidden() {
  return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
}

/** Snapshot: selected id, source previews, and the one current experience payload. */
export async function GET() {
  if (!shouldAllowOpsRoutes()) return forbidden();

  try {
    const { selectedId, experience, experiences, currentExperience } =
      await resolveCurrentExperience();
    return NextResponse.json({
      ok: true,
      selectedId,
      experience,
      experiences,
      currentExperience,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

/** Select which experience appears on retroverse.live. */
export async function POST(request: Request) {
  if (!shouldAllowOpsRoutes()) return forbidden();

  try {
    const body = (await request.json()) as { id?: unknown };
    if (!isExperienceId(body.id)) {
      return NextResponse.json({ ok: false, error: "Invalid experience id" }, { status: 400 });
    }

    const result = await selectExperience(body.id);
    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
