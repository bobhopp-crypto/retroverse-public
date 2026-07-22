import { NextResponse } from "next/server";

import {
  generateCredentialsArtworkPair,
  type CredentialsArtworkInput,
  type CredentialsCredentialType,
} from "@/lib/bobos/credentials/generation";
import { artworkErrorJson } from "@/lib/ops/creative-lab/artwork/provider-error";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { isRetroverseStyleId } from "@/lib/retroverse/style-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const EVENT_TYPES = new Set([
  "dj-night",
  "bingo",
  "karaoke",
  "trivia",
  "live-music",
  "dance",
  "holiday-event",
  "fundraiser",
  "private-party",
  "community-event",
  "other",
]);

const VENUE_TYPES = new Set([
  "community-hall",
  "civic-hall",
  "pub",
  "theater",
  "ballroom",
  "hotel",
  "outdoor",
  "school",
  "religious",
  "sports",
  "museum",
  "private",
  "other",
]);

const CREDENTIAL_TYPES = new Set<CredentialsCredentialType>(["event", "vip", "backstage"]);

function text(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if (!shouldAllowOpsRoutes(request.headers.get("host"))) {
    return NextResponse.json({ error: "Credentials generation is local-only." }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const eventName = text(body.eventName, 120);
  const venue = text(body.venue, 120);
  const date = text(body.date, 40);
  const optionalText = text(body.optionalText, 180);
  const eventType = text(body.eventType, 40);
  const venueType = text(body.venueType, 40);
  const credentialType = text(body.credentialType, 20) as CredentialsCredentialType;
  const familySeed =
    typeof body.familySeed === "number" && Number.isFinite(body.familySeed)
      ? Math.floor(body.familySeed)
      : Date.now();
  if (!eventName || !venue || !date) {
    return NextResponse.json({ error: "Event name, venue, and date are required." }, { status: 400 });
  }
  if (!EVENT_TYPES.has(eventType) || !VENUE_TYPES.has(venueType)) {
    return NextResponse.json({ error: "Choose a valid event type and venue type." }, { status: 400 });
  }
  if (!CREDENTIAL_TYPES.has(credentialType)) {
    return NextResponse.json({ error: "Choose a valid credential type." }, { status: 400 });
  }
  if (!isRetroverseStyleId(body.retroverseStyle)) {
    return NextResponse.json({ error: "Choose a valid Color Palette." }, { status: 400 });
  }

  const input: CredentialsArtworkInput = {
    eventName,
    venue,
    date,
    optionalText,
    eventType,
    venueType,
    retroverseStyle: body.retroverseStyle,
    credentialType,
    familySeed,
  };

  try {
    const result = await generateCredentialsArtworkPair(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const payload = artworkErrorJson(error);
    console.error("[credentials:generate]", payload, error);
    return NextResponse.json(payload, { status: 502 });
  }
}
