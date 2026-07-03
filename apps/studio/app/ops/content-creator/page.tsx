import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MyGenerationsWorkspace } from "@/components/ops/content-creator/MyGenerationsWorkspace";
import { inspectPing } from "@/lib/inspect/pg";
import { loadContentCreatorEras } from "@/lib/ops/content-creator/load-era-options";

import "./content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collectible Library — Content Creator",
  robots: { index: false, follow: false },
};

export default async function ContentCreatorLibraryPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    notFound();
  }

  const ping = await inspectPing();
  if (!ping.ok) {
    return (
      <main className="ops-page ops-page--content-creator">
        <p style={{ padding: "2rem" }}>Database offline.</p>
      </main>
    );
  }

  try {
    const eras = await loadContentCreatorEras();
    return (
      <main className="ops-page ops-page--content-creator cc-creator-page">
        <Suspense fallback={<p style={{ padding: "2rem" }}>Loading library…</p>}>
          <MyGenerationsWorkspace eras={eras} />
        </Suspense>
      </main>
    );
  } catch {
    return (
      <main className="ops-page ops-page--content-creator">
        <p style={{ padding: "2rem" }}>RVBR not seeded — run npx tsx tools/rvbr/seed-rvbr-profiles.ts</p>
      </main>
    );
  }
}
