import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceGallery } from "@/components/retroverse/gallery/ExperienceGallery";
import { loadGalleryPageData } from "@/lib/retroverse/gallery/load-gallery-page";
import type { GalleryPageData } from "@/lib/retroverse/gallery/gallery-types";
import {
  galleryInstrumentEnabled,
  galleryLog,
  galleryLogPayload,
  galleryTime,
  galleryTimeEnd,
} from "@/lib/retroverse/gallery/gallery-instrument";

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
  const trace = galleryInstrumentEnabled();
  if (trace) {
    galleryLog("[gallery-instrument] SERVER RetroverseExperienceGalleryPage ENTER");
    galleryTime("[gallery-instrument] SERVER page total");
    galleryTime("[gallery-instrument] SERVER searchParams await");
  }

  try {
  const { rvtr } = trace
    ? await (async () => {
        const params = await searchParams;
        galleryTimeEnd("[gallery-instrument] SERVER searchParams await");
        return params;
      })()
    : await searchParams;

  if (trace) galleryTime("[gallery-instrument] SERVER loadGalleryPageData");
  const loaded = await loadGalleryPageData(rvtr);
  if (trace) galleryTimeEnd("[gallery-instrument] SERVER loadGalleryPageData");
  if (!loaded) notFound();

  if (trace) galleryLogPayload("loadGalleryPageData result (pre-clone)", loaded);

  if (trace) galleryTime("[gallery-instrument] SERVER JSON clone");
  const data = JSON.parse(JSON.stringify(loaded)) as GalleryPageData;
  if (trace) {
    galleryTimeEnd("[gallery-instrument] SERVER JSON clone");
    galleryLogPayload("ExperienceGallery props (post-clone)", data);
    galleryLog("[gallery-instrument] SERVER scheduling ExperienceGallery render");
  }

  return <ExperienceGallery data={data} />;
  } finally {
    if (trace) {
      galleryTimeEnd("[gallery-instrument] SERVER page total");
      galleryLog("[gallery-instrument] SERVER RetroverseExperienceGalleryPage EXIT");
    }
  }
}
