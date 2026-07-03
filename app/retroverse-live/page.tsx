import type { Metadata } from "next";

import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";

import { RetroverseLivePlayer } from "./player";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/**
 * Retroverse Live — the public presentation player.
 *
 * This page is deliberately dumb: it asks "what is the current Playhead?"
 * and renders it. All authoring, sequencing, and control live in the
 * BobOS Presentation Studio.
 */
export default async function RetroverseLivePage() {
  const initial = await buildPlayheadPayload();
  return <RetroverseLivePlayer initial={initial} />;
}
