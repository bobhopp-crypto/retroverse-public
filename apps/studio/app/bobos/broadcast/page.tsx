import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BroadcastMixerView } from "@/components/bobos/broadcast-mixer/BroadcastMixerView";
import { getBroadcastStatus, getMixerState } from "@/app/bobos/broadcast/actions";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Broadcast Mixer — BobOS",
  robots: { index: false, follow: false },
};

export default async function BroadcastMixerPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const [status, mixer] = await Promise.all([getBroadcastStatus(), getMixerState()]);

  return <BroadcastMixerView initialStatus={status} initialMixer={mixer} />;
}
