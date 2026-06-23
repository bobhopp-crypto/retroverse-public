import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IntelligenceArtifactStudio } from "@/components/ops/intelligence/IntelligenceArtifactStudio";
import { buildArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";
import { hydratePackageIntel } from "@/lib/ops/intelligence/package-intel";
import { loadSongMetadata } from "@/lib/ops/intelligence/load-song-metadata";
import {
  createEmptySongPackage,
  loadSongPackage,
  saveSongPackage,
} from "@/lib/ops/intelligence/song-package-store";
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
    title: `${title} — Artifact Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function IntelligenceArtifactStudioPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const normalized = rvtr.trim().toUpperCase();
  if (!/^RVTR\d{6}$/.test(normalized)) notFound();

  let pkg = await loadSongPackage(normalized);
  if (!pkg) {
    const metadata = await loadSongMetadata(normalized);
    if (!metadata) notFound();
    pkg = await saveSongPackage(createEmptySongPackage(metadata));
  }

  pkg = hydratePackageIntel(pkg);
  const model = buildArtifactStudioModel(pkg);

  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body intel-app__body--wide">
        <IntelligenceArtifactStudio model={model} />
      </div>
    </main>
  );
}
