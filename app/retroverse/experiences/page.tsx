import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceGallery } from "@/components/retroverse/gallery/ExperienceGallery";
import { loadGalleryPageData } from "@/lib/retroverse/gallery/load-gallery-page";
import type { GalleryPageData } from "@/lib/retroverse/gallery/gallery-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experience Gallery — Retroverse",
  description:
    "The museum lobby for Retroverse experiences — chart journeys, song DNA, and every story built in Studio.",
};

type Props = {
  searchParams: Promise<{ rvtr?: string; experience?: string }>;
};

export default async function RetroverseExperienceGalleryPage({ searchParams }: Props) {
  const trace = process.env.RETROVERSE_GALLERY_TRACE === "1";
  if (trace) {
    console.log("[gallery-trace] page ENTER");
    console.time("[gallery-trace] page total");
  }

  try {
  const { rvtr } = await searchParams;
  const loaded = await loadGalleryPageData(rvtr);
  if (!loaded) notFound();

  if (trace) console.log("[gallery-trace] page loadGalleryPageData OK");

  // Plain JSON clone — guarantees no functions cross the RSC/client boundary.
  const data = JSON.parse(JSON.stringify(loaded)) as GalleryPageData;

  if (trace) console.log("[gallery-trace] page JSON clone OK — rendering ExperienceGallery");

  return <ExperienceGallery data={data} />;
  } finally {
    if (trace) {
      console.timeEnd("[gallery-trace] page total");
      console.log("[gallery-trace] page EXIT (render scheduled)");
    }
  }
}
