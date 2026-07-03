import { NextResponse } from "next/server";

import { isCrateBuilderYear, loadCrateBuilder } from "@/lib/ops/crate-builder/load";
import {
  assignCrateSong,
  renameCrateSet,
  setCrateSetColor,
} from "@/lib/ops/crate-builder/state";
import { appendCrateMoveLog } from "@/lib/ops/crate-builder/training-log";

export const dynamic = "force-dynamic";

function parseYear(value: unknown): number | null {
  const y = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

export async function GET(req: Request) {
  const year = parseYear(new URL(req.url).searchParams.get("year") ?? "1967");
  if (year == null) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }
  if (!isCrateBuilderYear(year)) {
    return NextResponse.json({ error: "Crate builder not enabled for year" }, { status: 404 });
  }

  try {
    return NextResponse.json(await loadCrateBuilder(year));
  } catch (err) {
    console.error("[crate-builder GET]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as {
    year?: number;
    op?: string;
    setId?: string;
    name?: string;
    colorId?: string;
    songKey?: string;
    artist?: string;
    title?: string;
    insertBefore?: string | null;
  };

  const year = parseYear(payload.year);
  if (year == null) {
    return NextResponse.json({ error: "year required" }, { status: 400 });
  }
  if (!isCrateBuilderYear(year)) {
    return NextResponse.json({ error: "Crate builder not enabled for year" }, { status: 404 });
  }

  const op = payload.op?.trim();

  try {
    if (op === "renameSet") {
      const setId = payload.setId?.trim();
      if (!setId) {
        return NextResponse.json({ error: "setId required" }, { status: 400 });
      }
      if (typeof payload.name !== "string") {
        return NextResponse.json({ error: "name required" }, { status: 400 });
      }
      await renameCrateSet(year, setId, payload.name);
      return NextResponse.json(await loadCrateBuilder(year));
    }

    if (op === "setColor") {
      const setId = payload.setId?.trim();
      if (!setId || typeof payload.colorId !== "string") {
        return NextResponse.json({ error: "setId and colorId required" }, { status: 400 });
      }
      await setCrateSetColor(year, setId, payload.colorId);
      return NextResponse.json(await loadCrateBuilder(year));
    }

    if (op === "assign") {
      const songKey = payload.songKey?.trim();
      if (!songKey) {
        return NextResponse.json({ error: "songKey required" }, { status: 400 });
      }
      const setId = payload.setId?.trim();
      if (!songKey || !setId) {
        return NextResponse.json({ error: "songKey and setId required" }, { status: 400 });
      }
      const insertBefore =
        payload.insertBefore === null || payload.insertBefore === undefined
          ? null
          : payload.insertBefore.trim() || null;

      const { fromSetId } = await assignCrateSong(year, songKey, setId, insertBefore);

      if (fromSetId !== setId) {
        await appendCrateMoveLog({
          ts: new Date().toISOString(),
          year,
          songKey,
          artist: payload.artist?.trim() ?? "",
          title: payload.title?.trim() ?? "",
          fromSetId,
          toSetId: setId,
        });
      }

      return NextResponse.json(await loadCrateBuilder(year));
    }

    return NextResponse.json({ error: "Unknown op" }, { status: 400 });
  } catch (err) {
    console.error("[crate-builder PATCH]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Update failed" },
      { status: 500 },
    );
  }
}
