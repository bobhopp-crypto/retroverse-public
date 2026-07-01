import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocalStudioLauncher } from "@/components/local/LocalStudioLauncher";
import { loadLocalStudioLauncherData } from "@/lib/local/load-local-studio-status";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local Studio — Retroverse",
  robots: { index: false, follow: false },
};

export default async function LocalStudioPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const data = await loadLocalStudioLauncherData();

  return <LocalStudioLauncher data={data} />;
}
