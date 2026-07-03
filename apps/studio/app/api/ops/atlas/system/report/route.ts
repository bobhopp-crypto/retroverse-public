import { normalize, relative, resolve } from "path";

import { readFileSync, statSync } from "fs";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

function resolveReportPath(input: string): string | null {
  const reportsRoot = resolve(process.cwd(), "reports");
  const candidate = resolve(process.cwd(), input.replace(/^\/+/, ""));
  const rel = relative(reportsRoot, candidate);
  if (rel.startsWith("..") || rel.includes("..")) return null;
  return candidate;
}

export async function GET(request: Request) {
  if (!isOpsEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const pathParam = url.searchParams.get("path")?.trim();
  if (!pathParam) {
    return Response.json({ error: "path is required" }, { status: 400 });
  }

  const normalized = normalize(pathParam);
  if (!normalized.startsWith("reports/")) {
    return Response.json({ error: "Only reports/ paths are allowed." }, { status: 403 });
  }

  const absolute = resolveReportPath(normalized);
  if (!absolute) {
    return Response.json({ error: "Invalid path." }, { status: 403 });
  }

  try {
    const stat = statSync(absolute);
    if (!stat.isFile()) {
      return Response.json({ error: "Not a file." }, { status: 404 });
    }
    const content = readFileSync(absolute, "utf8");
    return new Response(content, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Report not found." }, { status: 404 });
  }
}
