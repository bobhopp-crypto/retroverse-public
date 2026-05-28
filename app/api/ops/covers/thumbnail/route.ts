import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";
import { defaultCoverFsRoot, resolveCoverFilePath } from "@/lib/cover-integrity/score";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

function contentTypeForPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pathParam = new URL(request.url).searchParams.get("path")?.trim();
  if (!pathParam || !isSafeCanonicalCoverPath(pathParam)) {
    return new NextResponse("Invalid path", { status: 400 });
  }

  const abs = resolveCoverFilePath(defaultCoverFsRoot(), pathParam);
  if (!abs) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(abs);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentTypeForPath(pathParam),
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
