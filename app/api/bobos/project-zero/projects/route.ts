import { NextResponse } from "next/server";

import { createProject, listProjects } from "@/lib/bobos/project-zero/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  try {
    const body = (await req.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) {
      return NextResponse.json({ error: "Tell BobOS what you want to accomplish." }, { status: 400 });
    }
    const project = await createProject(prompt);
    return NextResponse.json({ project });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
