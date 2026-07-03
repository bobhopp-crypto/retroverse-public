import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AtlasScriptLauncher } from "@/components/atlas/AtlasScriptLauncher";
import { loadNpmScriptCatalog } from "@/lib/atlas/npm-script-catalog";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Script Launcher — Atlas Operations",
  robots: { index: false, follow: false },
};

export default async function AtlasScriptsPage() {
  if (!isOpsEnabled()) notFound();

  const catalog = await loadNpmScriptCatalog();

  return <AtlasScriptLauncher catalog={catalog} />;
}
