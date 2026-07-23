import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceSelector } from "@/components/bobos/experience-selector/ExperienceSelector";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broadcast Mixer — BobOS",
  robots: { index: false, follow: false },
};

export default function BroadcastMixerPage() {
  if (!shouldAllowOpsRoutes()) notFound();
  return <ExperienceSelector />;
}
