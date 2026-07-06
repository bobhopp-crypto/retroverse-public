import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { UniversalRenderer } from "@/components/universal-renderer/UniversalRenderer";
import { loadVdjBasePackage } from "@/lib/universal-renderer/load-vdj-base";

type Props = {
  params: Promise<{ key: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key } = await params;
  const payload = await loadVdjBasePackage(key);
  if (!payload) return { title: "Song — Retroverse" };
  return {
    title: `${payload.title} — ${payload.artist} — Retroverse`,
    description: `${payload.title} by ${payload.artist}${payload.year ? ` (${payload.year})` : ""} — a curated mobile experience on Retroverse.`,
  };
}

/**
 * Base experience for songs sourced from VirtualDJ that have no bundled
 * Retroverse package. Renders hero + optional stats + credits using the
 * same Universal Renderer as full song experiences.
 */
export default async function VdjBaseSongPage({ params }: Props) {
  const { key } = await params;
  const payload = await loadVdjBasePackage(key);
  if (!payload) notFound();

  return (
    <UniversalRenderer
      artist={payload.artist}
      title={payload.title}
      cards={payload.cards}
      theme={payload.theme}
    />
  );
}
