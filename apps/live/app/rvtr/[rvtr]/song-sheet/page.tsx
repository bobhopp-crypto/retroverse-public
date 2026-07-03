import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
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

/** Legacy song-sheet route — redirect to canonical Song Experience. */
export default async function SongSheetPage({ params }: Props) {
  const { rvtr } = await params;
  const normalized = normalizePackageRvtr(rvtr);
  if (!normalized) notFound();
  redirect(liveSongExperienceHref(normalized));
}
