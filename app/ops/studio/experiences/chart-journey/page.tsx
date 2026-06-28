import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./chart-journey-workspace.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chart Journey — Flagship Experience · Retroverse Studio",
  robots: { index: false, follow: false },
};

const SHOWCASE = [
  { rvtr: "RVTR001341", label: "Dr. Hook — When You're In Love With A Beautiful Woman" },
  { rvtr: "RVTR044043", label: "Blondie — Heart Of Glass" },
  { rvtr: "RVTR023559", label: "Fleetwood Mac — Dreams" },
  { rvtr: "RVTR891825", label: "Don McLean — American Pie" },
];

export default function ChartJourneyLandingPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page cj-landing">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="cj-landing__hero">
          <p className="cj-landing__badge">Experience 1.1 · Foundation</p>
          <h1>Chart Journey</h1>
          <p className="cj-landing__lead">
            The definitive Retroverse chart experience — cinematic story + week-by-week historical record.
          </p>
          <p className="cj-landing__note">
            Design workspace only. Iterate here before patron release.
          </p>
        </header>

        <section className="cj-landing__showcase">
          <h2>Showcase songs</h2>
          <ul>
            {SHOWCASE.map((song) => (
              <li key={song.rvtr}>
                <Link href={`/ops/studio/experiences/chart-journey/${song.rvtr}`}>
                  <strong>{song.rvtr}</strong>
                  <span>{song.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="cj-landing__back">
          <Link href="/ops/studio">← Mission Control</Link>
        </p>
      </div>
    </main>
  );
}
