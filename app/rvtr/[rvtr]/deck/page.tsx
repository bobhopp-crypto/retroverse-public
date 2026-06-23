import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LiveExperienceShell } from "@/components/live-experience/LiveExperienceShell";
import { PerformanceDeckView } from "@/components/rvtr/performance-deck/PerformanceDeckView";
import { buildLiveExperienceShellModel } from "@/lib/live-experience/shell-model";
import { loadPerformanceDeck } from "@/lib/ops/intelligence/load-performance-deck";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const deck = await loadPerformanceDeck(rvtr);
  if (!deck) {
    return { title: "Performance Deck - RetroVerse" };
  }

  return {
    title: `${deck.title} - ${deck.artist} - Performance Deck`,
    description: `Swipe through the live Retroverse deck for ${deck.title} by ${deck.artist}.`,
  };
}

export default async function PerformanceDeckPage({ params }: Props) {
  const { rvtr } = await params;
  const model = await loadPerformanceDeck(rvtr);
  if (!model) notFound();
  const hero = model.cards.find((card) => card.type === "hero");
  const shell = await buildLiveExperienceShellModel({
    rvtr: model.rvtr,
    title: model.title,
    artist: model.artist,
    year: hero?.type === "hero" ? hero.year : null,
    peakHot100: hero?.type === "hero" ? hero.peakHot100 : null,
    activeTab: "Deck",
  });

  return (
    <LiveExperienceShell {...shell}>
      <PerformanceDeckView model={model} />
    </LiveExperienceShell>
  );
}
