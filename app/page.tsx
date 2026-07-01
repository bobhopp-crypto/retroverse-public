import type { Metadata } from "next";
import { Suspense } from "react";

import { HomeShell } from "@/components/home/HomePackageBrowser";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { resolveHomepageRvtr } from "@/lib/home/homepage-rvtr";

import "@/components/home/homepage-v1.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse",
  description: "Browse everything Retroverse knows about the song — live or on demand.",
};

type Props = {
  searchParams: Promise<{ rvtr?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const { rvtr: manualRvtr } = await searchParams;
  const resolution = await resolveHomepageRvtr(manualRvtr ?? null);

  return (
    <main className="home-v1">
      <Suspense fallback={null}>
        <HomeShell initialResolution={resolution} />
      </Suspense>

      <div className="home-v1__main">
        {resolution.rvtr ? (
          <PublicSongExperience rvtr={resolution.rvtr} className="home-v1__song" />
        ) : (
          <div className="home-v1__empty">
            <p>No package loaded.</p>
            <p>Search for a song or enable Live Broadcast.</p>
          </div>
        )}
      </div>
    </main>
  );
}
