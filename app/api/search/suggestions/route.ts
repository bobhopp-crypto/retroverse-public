import { NextResponse } from "next/server";

import { loadSuggestionResponse } from "@/lib/search/load-suggestion-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const result = await loadSuggestionResponse(q);

  if (!result.ok) {
    return NextResponse.json(result, { status: result.error?.includes("not configured") ? 503 : 502 });
  }

  return NextResponse.json(result);
}
