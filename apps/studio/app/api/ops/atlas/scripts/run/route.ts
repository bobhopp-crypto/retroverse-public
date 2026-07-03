import { runNpmScript } from "@/lib/atlas/npm-script-runner";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return new Response("Not found", { status: 404 });
  }

  let scriptName = "";
  try {
    const body = (await request.json()) as { scriptName?: string };
    scriptName = body.scriptName?.trim() ?? "";
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!scriptName) {
    return Response.json({ error: "scriptName is required." }, { status: 400 });
  }

  const result = runNpmScript(scriptName);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return new Response(result.stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
