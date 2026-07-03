import { NextResponse } from "next/server";

import { inspectPing } from "@/lib/inspect/pg";
import { loadSortingBoard } from "@/lib/ops/sorting-board/load-board";
import {
  assignSortingSong,
  renameSortingBucket,
  setBucketOrder,
} from "@/lib/ops/sorting-board/state";
import { reviewUniverseEnabledForYear } from "@/lib/ops/year-workspace/review-pilot";

export const dynamic = "force-dynamic";

function parseYear(value: unknown): number | null {
  const y = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline" },
      { status: 503 },
    );
  }

  const year = parseYear(new URL(req.url).searchParams.get("year"));
  if (year == null) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }
  if (!reviewUniverseEnabledForYear(year)) {
    return NextResponse.json({ error: "Sorting board not enabled for year" }, { status: 404 });
  }

  try {
    return NextResponse.json(await loadSortingBoard(year));
  } catch (err) {
    console.error("[sorting-board GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const ping = await inspectPing();
  if (!ping.ok) {
    return NextResponse.json(
      { error: ping.error ?? "Postgres offline" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    year?: number;
    op?: string;
    bucketId?: string;
    name?: string;
    workspaceKey?: string;
    insertBefore?: string | null;
    order?: string[];
  };

  const year = parseYear(payload.year);
  if (year == null) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }
  if (!reviewUniverseEnabledForYear(year)) {
    return NextResponse.json({ error: "Sorting board not enabled for year" }, { status: 404 });
  }

  const op = payload.op?.trim();

  try {
    if (op === "renameBucket") {
      const bucketId = payload.bucketId?.trim();
      if (!bucketId) {
        return NextResponse.json({ error: "bucketId required" }, { status: 400 });
      }
      if (typeof payload.name !== "string") {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      await renameSortingBucket(year, bucketId, payload.name);
      return NextResponse.json(await loadSortingBoard(year));
    }

    if (op === "assign") {
      const workspaceKey = payload.workspaceKey?.trim();
      if (!workspaceKey) {
        return NextResponse.json({ error: "workspaceKey required" }, { status: 400 });
      }
      const bucketId =
        payload.bucketId === null || payload.bucketId === undefined
          ? null
          : payload.bucketId.trim() || null;
      const insertBefore =
        payload.insertBefore === null || payload.insertBefore === undefined
          ? null
          : payload.insertBefore.trim() || null;
      await assignSortingSong(year, workspaceKey, bucketId, insertBefore);
      return NextResponse.json(await loadSortingBoard(year));
    }

    if (op === "setBucketOrder") {
      const bucketId = payload.bucketId?.trim();
      if (!bucketId) {
        return NextResponse.json({ error: "bucketId required" }, { status: 400 });
      }
      if (!Array.isArray(payload.order)) {
        return NextResponse.json({ error: "order required" }, { status: 400 });
      }
      await setBucketOrder(year, bucketId, payload.order);
      return NextResponse.json(await loadSortingBoard(year));
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    console.error("[sorting-board PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
