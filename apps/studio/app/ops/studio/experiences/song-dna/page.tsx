import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./song-dna-workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song DNA — Flagship Experience · Retroverse Studio",
  robots: { index: false, follow: false },
};

const SHOWCASE = [{ rvtr: "RVTR001341", label: "Dr. Hook — When You're In Love With A Beautiful Woman" }];

export default function SongDnaLandingPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page sdna-landing">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="sdna-landing__hero">
          <p className="sdna-landing__badge">Experience 2.0 · Sprint 3.38</p>
          <h1>Song DNA</h1>
          <p className="sdna-landing__lead">
            Why does this song feel the way it does? An interactive museum exhibit — not a statistics
            dashboard.
          </p>
          <p className="sdna-landing__note">Design workspace only. Not published to patrons.</p>
        </header>

        <section className="sdna-landing__showcase">
          <h2>Development song</h2>
          <ul>
            {SHOWCASE.map((song) => (
              <li key={song.rvtr}>
                <Link href={`/ops/studio/experiences/song-dna/${song.rvtr}`}>
                  <strong>{song.rvtr}</strong>
                  <span>{song.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="sdna-landing__links">
          <Link href="/ops/studio/experiences/chart-journey">Chart Journey →</Link>
          <Link href="/ops/studio">Mission Control</Link>
        </p>
      </div>
    </main>
  );
}
