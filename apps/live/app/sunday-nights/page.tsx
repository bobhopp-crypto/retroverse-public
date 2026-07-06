import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getPublicLiveRedirectUrl } from "@/lib/live-control/public-entry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Live audience presentation from RetroVerse Broadcast.",
};

export default async function SundayNightsPage() {
  redirect(await getPublicLiveRedirectUrl());
}
