import { NextResponse } from "next/server";

import { normalizeArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import { createProject, listProjects } from "@/lib/ops/creative-lab/projects";
import { normalizeStyleSelection } from "@/lib/ops/creative-lab/style-catalog";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }
  const projects = await listProjects();
  return NextResponse.json({ ok: true, projects });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name : "";
  if (!name.trim()) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const featuredYears = Array.isArray(body.featuredYears)
    ? body.featuredYears.filter((y): y is number => typeof y === "number")
    : undefined;

  const project = await createProject({
    name,
    event: typeof body.event === "string" ? body.event : undefined,
    venue: typeof body.venue === "string" ? body.venue : undefined,
    date: typeof body.date === "string" ? body.date : undefined,
    featuredYears,
    theme: typeof body.theme === "string" ? body.theme : undefined,
    styleSelection: body.styleSelection ? normalizeStyleSelection(body.styleSelection) : undefined,
    artifactType: body.artifactType !== undefined ? normalizeArtifactTypeId(body.artifactType) : undefined,
  });

  return NextResponse.json({ ok: true, project });
}
