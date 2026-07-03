import { NextResponse } from "next/server";

import { collectionIdFromSlug } from "@/lib/ops/media-collections/paths";
import {
  revealCollectionPath,
  type CollectionRevealTarget,
} from "@/lib/ops/media-collections/reveal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

function parseTarget(value: unknown): CollectionRevealTarget {
  if (
    value === "root" ||
    value === "downloads" ||
    value === "episodes" ||
    value === "metadata" ||
    value === "transcripts"
  ) {
    return value;
  }
  return "root";
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ collection: string }> },
) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const { collection: slug } = await ctx.params;
  const collectionId = collectionIdFromSlug(slug);

  let body: { target?: unknown } = {};
  try {
    body = (await req.json()) as { target?: unknown };
  } catch {
    // default target
  }

  const target = parseTarget(body.target);
  const result = await revealCollectionPath(collectionId, target);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, path: result.path });
}
