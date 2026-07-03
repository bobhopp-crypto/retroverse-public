import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { loadPerformanceDeck } from "@/lib/ops/intelligence/load-performance-deck";
import { normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const deck = await loadPerformanceDeck(rvtr);
  if (!deck) {
    return { title: "Song Experience - RetroVerse" };
  }

  return {
    title: `${deck.title} - ${deck.artist} - Song Experience`,
    description: `Swipe through the live Retroverse deck for ${deck.title} by ${deck.artist}.`,
  };
}

/** Legacy performance deck route — redirect to canonical Song Experience. */
export default async function PerformanceDeckPage({ params }: Props) {
  const { rvtr } = await params;
  const normalized = normalizePackageRvtr(rvtr);
  if (!normalized) notFound();
  redirect(liveSongExperienceHref(normalized));
}
