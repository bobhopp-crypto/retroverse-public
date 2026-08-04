import { NextResponse } from "next/server";

import { EDITING_PROXY_PROFILE } from "@/lib/ops/media-lab/editing-proxy";
import {
  inspectEditingProxy,
  resolveEditingProxyJob,
} from "@/lib/ops/media-lab/editing-proxy-store";
import {
  cancelEditingProxyGeneration,
  getProxyGenerationStatus,
  startEditingProxyGeneration,
} from "@/lib/ops/media-lab/editing-proxy-worker";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseJobRequest(request: Request): {
  year: number;
  jobSlug: string;
} {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year"));
  const jobSlug = url.searchParams.get("jobSlug")?.trim() ?? "";
  if (!Number.isInteger(year) || year < 1900 || year >= 2100 || !jobSlug) {
    throw new Error("year and jobSlug are required");
  }
  return { year, jobSlug };
}

function proxyVideoUrl(options: {
  year: number;
  jobSlug: string;
  sourceFingerprint: string;
}): string {
  const query = new URLSearchParams({
    year: String(options.year),
    jobSlug: options.jobSlug,
    sourceFingerprint: options.sourceFingerprint,
    profile: EDITING_PROXY_PROFILE.id,
  });
  return `/api/ops/media-lab/editing-proxy/video?${query}`;
}

async function proxyPayload(request: Request) {
  const { year, jobSlug } = parseJobRequest(request);
  const context = await resolveEditingProxyJob(year, jobSlug);
  const [readiness, generation] = await Promise.all([
    inspectEditingProxy(context),
    Promise.resolve(getProxyGenerationStatus(context)),
  ]);
  const preparing = generation?.state === "preparing";
  const ready = readiness.state === "ready" && !preparing;
  return {
    ok: true,
    proxyState: preparing ? "preparing" : readiness.state,
    readiness,
    generation,
    videoUrl: ready
      ? proxyVideoUrl({
          year,
          jobSlug,
          sourceFingerprint: context.job.sourceFingerprint!,
        })
      : null,
    sourceFingerprint: context.job.sourceFingerprint,
    profile: EDITING_PROXY_PROFILE,
  };
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  try {
    return NextResponse.json(await proxyPayload(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Proxy status failed" },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  try {
    const { year, jobSlug } = parseJobRequest(request);
    const context = await resolveEditingProxyJob(year, jobSlug);
    await startEditingProxyGeneration(context);
    return NextResponse.json(await proxyPayload(request), { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Proxy preparation failed",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  try {
    const { year, jobSlug } = parseJobRequest(request);
    const context = await resolveEditingProxyJob(year, jobSlug);
    const generation = await cancelEditingProxyGeneration(context);
    if (!generation) {
      return NextResponse.json(
        { error: "No proxy preparation is running for this job" },
        { status: 409 },
      );
    }
    return NextResponse.json(await proxyPayload(request));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Proxy cancellation failed",
      },
      { status: 400 },
    );
  }
}
