import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Now Playing — Retroverse",
  description: "Live audience presentation from RetroVerse Broadcast.",
};

export default async function LivePage() {
  redirect(await getPublicLiveRedirectUrl());
}
