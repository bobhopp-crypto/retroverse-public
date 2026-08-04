import { readFile } from "node:fs/promises";
import { extname } from "node:path";

import { NextResponse } from "next/server";

import {
  ensureMagazineHeroFrame,
  isMagazineHomepageBenchmark,
  resolveCandidateFramePath,
  resolveMagazineHeroFramePath,
} from "@/lib/ops/issue-generation/magazine-hero-frame";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const rvtr = url.searchParams.get("rvtr")?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || !isMagazineHomepageBenchmark(rvtr)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const candidate = url.searchParams.get("candidate");
  const path = candidate
    ? await resolveCandidateFramePath(rvtr, candidate)
    : await resolveMagazineHeroFramePath(rvtr);
  if (!path) return new NextResponse("Not found", { status: 404 });

  try {
    const bytes = await readFile(path);
    const contentType = extname(path).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    return new NextResponse(bytes, {
      headers: { "content-type": contentType, "cache-control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function POST(request: Request) {
  if (!isOpsEnabled()) return new NextResponse("Not found", { status: 404 });
  const body = (await request.json().catch(() => null)) as { rvtr?: string; framePath?: string; reason?: string } | null;
  const rvtr = body?.rvtr?.toUpperCase();
  if (!rvtr || !/^RVTR\d{6}$/.test(rvtr) || !body?.framePath) {
    return NextResponse.json({ ok: false, error: "Invalid hero frame selection." }, { status: 400 });
  }

  const { selectMagazineHeroFrame } = await import("@/lib/ops/issue-generation/magazine-hero-frame");
  const record = await selectMagazineHeroFrame(rvtr, body.framePath, body.reason);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Hero frame could not be selected." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, rvtr, magazineHeroFrame: record });
}
