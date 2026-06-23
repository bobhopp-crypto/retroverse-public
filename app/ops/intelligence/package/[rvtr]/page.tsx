import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IntelligencePackageViewer } from "@/components/ops/intelligence/IntelligencePackageViewer";
import { loadPackageRelationships } from "@/lib/ops/intelligence/load-package-relationships";
import { loadPackageDiagnostics } from "@/lib/ops/intelligence/package-diagnostics";
import { buildPackageViewModel } from "@/lib/ops/intelligence/package-view-model";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { loadSongPackage } from "@/lib/ops/intelligence/song-package-store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const pkg = await loadSongPackage(rvtr);
  const title = pkg?.metadata.title ?? rvtr;
  return {
    title: `${title} — Song Package`,
    robots: { index: false, follow: false },
  };
}

export default async function IntelligencePackagePage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const normalized = rvtr.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(normalized)) notFound();

  let pkg = await loadSongPackage(normalized);
  if (!pkg) notFound();

  pkg = hydratePackageIntel(pkg);
  const relationships = loadPackageRelationships(pkg);
  const view = buildPackageViewModel(pkg, relationships);
  const diagnostics = await loadPackageDiagnostics(pkg);

  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body intel-app__body--wide">
        <IntelligencePackageViewer view={view} diagnostics={diagnostics} />
      </div>
    </main>
  );
}
