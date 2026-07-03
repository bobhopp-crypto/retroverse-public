import { readFile } from "fs/promises";

import { NextResponse } from "next/server";

import { bobosRenderAbsolutePath } from "@/lib/bobos/project-zero/pass-production";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function contentType(name: string): string {
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = path.join("/");
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const buffer = await readFile(bobosRenderAbsolutePath(rel));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType(rel),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
