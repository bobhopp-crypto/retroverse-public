import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Song Experiences — Retroverse",
  description: "Universal Mobile Experience Renderer demo — three packages at different richness levels.",
};

/**
 * Demo index for the Universal Mobile Experience Renderer.
 *
 * Shows three representative packages:
 *   Sparse  — minimal data, hero + credits only
 *   Medium  — charts + album + a few story cards
 *   Rich    — full card suite
 */

type DemoEntry = {
  label: string;
  rvtr: string;
  artist: string;
  title: string;
  year: string;
  level: "Sparse" | "Medium" | "Rich";
  description: string;
};

const DEMOS: DemoEntry[] = [
  {
    label: "Sparse",
    rvtr: "RVTR037683",
    artist: "Bad Company",
    title: "Feel Like Makin Love",
    year: "1975",
    level: "Sparse",
    description: "No cover, no chart data. Hero + credits only.",
  },
  {
    label: "Medium",
    rvtr: "RVTR573393",
    artist: "The Bangles",
    title: "Walk Like An Egyptian",
    year: "1986",
    level: "Medium",
    description: "Cover art, chart history, album, a story card.",
  },
  {
    label: "Rich",
    rvtr: "RVTR285085",
    artist: "Paul Simon",
    title: "You Can Call Me Al",
    year: "1986",
    level: "Rich",
    description: "Full card suite: cover, charts, stories, timeline, facts.",
  },
];

const LEVEL_COLOR: Record<DemoEntry["level"], string> = {
  Sparse: "#6b7280",
  Medium: "#0f6b66",
  Rich:   "#e05a32",
};

export default function SongDemoPage() {
  return (
    <main style={{
      minHeight: "100vh",
      background: "#f7ead0",
      padding: "2rem 1.5rem",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#172923",
    }}>
      <header style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#e05a32", margin: "0 0 0.4rem" }}>
          Retroverse
        </p>
        <h1 style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.8rem, 7vw, 2.6rem)", fontWeight: 900, lineHeight: 1.08 }}>
          Universal Renderer
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", fontWeight: 500, color: "rgba(23,41,35,0.65)", maxWidth: "32rem" }}>
          Any RVTR automatically renders an experience. These three demos show sparse, medium, and rich packages.
        </p>
      </header>

      <div style={{ display: "grid", gap: "1rem", maxWidth: "28rem" }}>
        {DEMOS.map((d) => (
          <Link
            key={d.rvtr}
            href={`/song/${d.rvtr}`}
            style={{
              display: "block",
              padding: "1.25rem 1.3rem",
              border: "3px solid #172923",
              borderRadius: "16px",
              background: "#fffaf0",
              boxShadow: "5px 5px 0 rgba(23,41,35,0.15)",
              textDecoration: "none",
              color: "#172923",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <span style={{
                fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.1em",
                textTransform: "uppercase", color: LEVEL_COLOR[d.level],
              }}>
                {d.level}
              </span>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(23,41,35,0.4)", letterSpacing: "0.05em" }}>
                {d.rvtr}
              </span>
            </div>
            <p style={{ margin: "0 0 0.15rem", fontSize: "1.2rem", fontWeight: 900, lineHeight: 1.15 }}>
              {d.title}
            </p>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.95rem", fontWeight: 700, color: "#0f6b66", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {d.artist} · {d.year}
            </p>
            <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 500, color: "rgba(23,41,35,0.6)" }}>
              {d.description}
            </p>
          </Link>
        ))}
      </div>

      <footer style={{ marginTop: "3rem" }}>
        <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", color: "rgba(23,41,35,0.35)" }}>
          Any /song/RVTR______ URL uses this renderer automatically.
        </p>
      </footer>
    </main>
  );
}
