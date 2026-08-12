import { NextResponse } from "next/server";

import { listVirtualDjMyLists } from "@/lib/ops/virtualdj-media-coverage/my-lists";
import { buildVirtualDjLibraryIndex } from "@/lib/ops/virtualdj-media-coverage/vdj-index";

import { coverageError, requireCoverageOps } from "../_helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const disabled = requireCoverageOps();
  if (disabled) return disabled;
  try {
    const [myLists, inventory] = await Promise.all([
      listVirtualDjMyLists(),
      buildVirtualDjLibraryIndex(),
    ]);
    return NextResponse.json({ ok: true, myLists, inventory: inventory.summary });
  } catch (error) {
    return coverageError(error, "Could not load VirtualDJ MyLists");
  }
}

