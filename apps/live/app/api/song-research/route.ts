import "server-only";
import { NextResponse } from "next/server";
import { songResearchService } from "../../../lib/song-research/service";

// Runtime route -> service -> OpenAI adapter; production composition stays disabled.
// Never accept public prompts, model overrides or user-supplied song identity.
export async function GET() {
  const response = await songResearchService();
  return NextResponse.json(response.body, { status: response.status, headers: response.headers });
}
