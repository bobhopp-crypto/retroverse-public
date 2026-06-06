import { NextResponse } from "next/server";

import { expectedOpsPin } from "@/lib/ops/ops-gate";
import {
  fetchDeployPreview,
  triggerProductionDeploy,
} from "@/lib/sunday-nights/system/deploy";
import { refreshSundayNightsData } from "@/lib/sunday-nights/system/refresh-data";
import { validateSundayNights } from "@/lib/sunday-nights/system/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const action = new URL(req.url).searchParams.get("action");
  if (action === "deployPreview") {
    const preview = await fetchDeployPreview();
    const hookConfigured = Boolean(process.env.VERCEL_DEPLOY_HOOK_URL?.trim());
    return NextResponse.json({ preview, hookConfigured });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    op?: string;
    pin?: string;
    confirm?: boolean;
  };

  if (payload.op === "validate") {
    const result = await validateSundayNights();
    return NextResponse.json({
      pass: result.pass,
      failures: result.failures,
      checks: result.checks,
    });
  }

  if (payload.op === "refresh") {
    try {
      const report = await refreshSundayNightsData();
      return NextResponse.json({ report });
    } catch (err) {
      console.error("[ops/sunday-nights/system refresh]", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Refresh failed" },
        { status: 500 },
      );
    }
  }

  if (payload.op === "deployPreview") {
    const preview = await fetchDeployPreview();
    return NextResponse.json({ preview });
  }

  if (payload.op === "deploy") {
    const pin = payload.pin?.trim() ?? "";
    if (pin !== expectedOpsPin()) {
      return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
    }
    if (payload.confirm !== true) {
      return NextResponse.json({ error: "confirm required" }, { status: 400 });
    }

    const preview = await fetchDeployPreview();
    const result = await triggerProductionDeploy();
    return NextResponse.json({ preview, result });
  }

  return NextResponse.json({ error: "Unknown op" }, { status: 400 });
}
