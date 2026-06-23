import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveExperienceShell } from "@/components/live-experience/LiveExperienceShell";
import { SongSheetView } from "@/components/rvtr/SongSheetView";
import { buildLiveExperienceShellModel } from "@/lib/live-experience/shell-model";
import { loadSongSheet } from "@/lib/ops/intelligence/load-song-sheet";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const sheet = await loadSongSheet(rvtr);
  if (!sheet) {
    return { title: "Song Sheet — RetroVerse" };
  }
  return {
    title: `${sheet.title} — ${sheet.artist} — Song Sheet`,
    description: `Stories, facts, and artifacts for ${sheet.title} by ${sheet.artist} in RetroVerse.`,
    openGraph: {
      title: `${sheet.title} — Song Sheet`,
      description: `Discover the story behind ${sheet.title}.`,
      images: sheet.coverUrl ? [{ url: sheet.coverUrl }] : undefined,
    },
  };
}

export default async function SongSheetPage({ params }: Props) {
  const { rvtr } = await params;
  const model = await loadSongSheet(rvtr);
  if (!model) notFound();
  const shell = await buildLiveExperienceShellModel({
    rvtr: model.rvtr,
    title: model.title,
    artist: model.artist,
    year: model.year,
    peakHot100: model.chartPeak,
    activeTab: "Story",
  });

  return (
    <LiveExperienceShell {...shell}>
      <SongSheetView model={model} />
    </LiveExperienceShell>
  );
}
