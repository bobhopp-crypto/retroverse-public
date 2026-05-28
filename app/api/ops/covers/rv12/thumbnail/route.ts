import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { listRv12Assets } from "@/lib/rv12/ledger";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const rv12Id = new URL(request.url).searchParams.get("rv12Id")?.trim().toUpperCase();
  if (!rv12Id || !/^RV12\d{6}$/.test(rv12Id)) {
    return new NextResponse("Invalid rv12Id", { status: 400 });
  }

  const assets = await listRv12Assets();
  const asset = assets.find((a) => a.rv12Id === rv12Id);
  if (!asset) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(asset.localPath);
    const lower = asset.localPath.toLowerCase();
    const type = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return new NextResponse(buf, {
      headers: { "Content-Type": type, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
