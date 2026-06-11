import type { Metadata } from "next";
import { notFound } from "next/navigation";

import "../content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content Creator Debug — Retroverse Ops",
  robots: { index: false, follow: false },
};

const LINKS = [
  { href: "/ops/content-creator/debug/classic", label: "Classic workflow (gallery)" },
  { href: "/ops/content-creator/debug/v2-poc", label: "v2 POC (artwork/composite)" },
  { href: "/ops/content-creator/debug/rvbr-validation", label: "RVBR visual validation" },
];

export default function ContentCreatorDebugPage() {
  if (process.env.RETROVERSE_OPS !== "1") notFound();

  return (
    <main className="ops-page ops-page--content-creator" style={{ padding: "2rem" }}>
      <h1>Content Creator — Debug</h1>
      <p style={{ color: "var(--cc-dim, #888)" }}>Developer tools only. Not part of the creator workflow.</p>
      <ul style={{ marginTop: "1.5rem", lineHeight: 2 }}>
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: "2rem" }}>
        <a href="/ops/content-creator">← Content Creator</a>
      </p>
    </main>
  );
}
