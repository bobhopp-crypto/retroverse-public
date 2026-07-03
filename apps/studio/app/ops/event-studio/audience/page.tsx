import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audience — Event Studio",
  robots: { index: false, follow: false },
};

export default function EventStudioAudienceRedirectPage() {
  redirect("/ops/event-studio/giveaway/audience");
}
