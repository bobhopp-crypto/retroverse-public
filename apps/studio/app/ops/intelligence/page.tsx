import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SongPackagesCommandCenter } from "@/components/ops/intelligence/SongPackagesCommandCenter";
import { loadSongPackageManagementView } from "@/lib/ops/intelligence/load-song-package-management";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Research Center — Retroverse Ops",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams?: Promise<{ rvtr?: string }>;
};

export default async function IntelligenceHomePage({ searchParams }: Props) {
  if (!isOpsEnabled()) notFound();

  const params = await searchParams;
  const view = await loadSongPackageManagementView();
  const initialRvtr = params?.rvtr?.trim().toUpperCase() ?? null;

  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body">
        <Link className="intel-review__back" href="/ops">
          ← Ops
        </Link>

        <section className="intel-home__hero">
          <h1 className="intel-title">Research Center</h1>
          <p className="intel-home__lead">
            Dashboard, gallery, queue, and maintenance for song research and experience readiness.
          </p>
          <nav className="package-center__nav" aria-label="Research center sections">
            <a href="#dashboard">Dashboard</a>
            <a href="#gallery">Gallery</a>
            <a href="#queue">Queue</a>
            <a href="#maintenance">Maintenance</a>
          </nav>
        </section>

        <SongPackagesCommandCenter view={view} initialRvtr={initialRvtr} />
      </div>
    </main>
  );
}
