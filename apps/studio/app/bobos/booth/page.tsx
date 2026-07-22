import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceSelector } from "@/components/bobos/experience-selector/ExperienceSelector";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experience Selector — BobOS",
  robots: { index: false, follow: false },
};

export default function ExperienceSelectorPage() {
  if (!shouldAllowOpsRoutes()) notFound();
  return <ExperienceSelector />;
}
