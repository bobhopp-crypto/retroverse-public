import { NextResponse } from "next/server";

import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";
import { productionEligibility } from "@/lib/ops/home-page-factory-eligibility";
import type { FactoryBrowserRow } from "@/lib/ops/home-page-factory-model";
import {
  loadIssueGenerationMonitor,
  type IssueGenerationMonitorJob,
} from "@/lib/ops/issue-generation-monitor";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });

  const [rawModel, issueGeneration] = await Promise.all([
    loadBrowserPlusModel(),
    loadIssueGenerationMonitor(),
  ]);

  const candidates = rawModel.rows.filter((row) => row.isVideo && (row.playCount ?? 0) >= 1);
  const ranked = [...candidates].sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0));
  const limited: typeof ranked = [];
  const seen = new Set<string>();
  for (const row of ranked) {
    if (seen.has(row.id)) continue;
    if (limited.length >= 400) break;
    limited.push(row);
    seen.add(row.id);
  }

  const rows: FactoryBrowserRow[] = limited.map((row) => ({
    id: row.id,
    artist: row.artist,
    title: row.title,
    album: row.album,
    year: row.year,
    playCount: row.playCount,
    rvtr: row.rvtr,
    thumbnailUrl: row.thumbnailUrl,
    lengthSeconds: row.lengthSeconds,
    fileExists: row.fileExists,
    isVideo: row.isVideo,
    canonicalPreflight: productionEligibility(row),
  }));
  // The Factory receives only V1 frame/review data. Generated artwork, collage,
  // prompts, and pilot evidence remain in the monitor for experimental tooling.
  const v1Jobs: IssueGenerationMonitorJob[] = issueGeneration.jobs.map((job) => ({
    rvtr: job.rvtr,
    title: job.title,
    artist: job.artist,
    year: job.year,
    playCount: job.playCount,
    status: job.status,
    origin: job.origin,
    reviewState: job.reviewState,
    frameSelection: job.frameSelection,
    magazineHeroFrame: job.magazineHeroFrame,
    updatedAt: job.updatedAt,
  }));

  return NextResponse.json(
    {
      rows,
      issueGeneration: {
        updatedAt: issueGeneration.updatedAt,
        jobs: v1Jobs,
        counts: issueGeneration.counts,
        lastLog: null,
        stateDirs: [],
      },
    },
    { headers: { "cache-control": "private, no-store" } },
  );
}
