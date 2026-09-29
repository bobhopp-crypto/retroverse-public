import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { loadTrackPage } from "@/lib/track/load-track-page";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const track = await loadTrackPage(rvtr);
  if (!track) {
    return { title: "Song Sheet — RetroVerse" };
  }
  return {
    title: `${track.title} — ${track.artistName} — Song Sheet`,
    description: `Stories, facts, and artifacts for ${track.title} by ${track.artistName} in RetroVerse.`,
    openGraph: {
      title: `${track.title} — Song Sheet`,
      description: `Discover the story behind ${track.title}.`,
      images: track.coverUrl ? [{ url: track.coverUrl }] : undefined,
    },
  };
}

/** Legacy song-sheet route — redirect to canonical Song Experience. */
export default async function SongSheetPage({ params }: Props) {
  const { rvtr } = await params;
  const normalized = normalizePackageRvtr(rvtr);
  if (!normalized) notFound();
  redirect(liveSongExperienceHref(normalized));
}
