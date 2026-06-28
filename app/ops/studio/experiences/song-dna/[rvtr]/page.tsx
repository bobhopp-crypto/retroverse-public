import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SongDnaWorkspace } from "@/components/experiences/song-dna/SongDnaWorkspace";
import { loadSongDnaWorkspace } from "@/lib/experiences/song-dna";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./song-dna-workspace.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const payload = await loadSongDnaWorkspace(rvtr);
  if (!payload?.experience) return { title: "Song DNA — Retroverse Studio" };
  return {
    title: `${payload.experience.title} — Song DNA · Retroverse Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function SongDnaWorkspacePage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const payload = await loadSongDnaWorkspace(rvtr);

  if (!payload) notFound();

  if (!payload.hasSongDna || !payload.experience) {
    return (
      <main className="ops-page ops-command ops-studio-page sdna-landing">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <h1>Song DNA</h1>
          <p>
            No Song DNA package for <strong>{rvtr.toUpperCase()}</strong>. Run Collector first.
          </p>
          <p className="sdna-landing__back">
            <Link href="/ops/studio/experiences/song-dna">← Song DNA workspace</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <p className="sdna-landing__back">
          <Link href="/ops/studio/experiences/song-dna">← Song DNA workspace</Link>
        </p>
        <SongDnaWorkspace experience={payload.experience} />
      </div>
    </main>
  );
}
