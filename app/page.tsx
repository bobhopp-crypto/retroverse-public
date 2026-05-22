export default function HomePage() {
  return (
    <main>
      <div className="poster-shell">
        <div className="poster-frame">
          <img
            className="poster-image"
            src="/retroverse-home.png"
            alt="Retroverse — Time is not a list. It's a place."
            width={900}
            height={1600}
            fetchPriority="high"
          />

          {/* Search panel — placeholder */}
          <button
            type="button"
            className="hotspot hotspot--search"
            style={{
              top: "38%",
              left: "7%",
              width: "86%",
              height: "16%",
            }}
            aria-label="Search Retroverse (coming soon)"
          />

          {/* Charts — VIEW CHARTS button area */}
          <a
            href="#/charts-placeholder"
            className="hotspot"
            style={{
              top: "70%",
              left: "52%",
              width: "41%",
              height: "9%",
            }}
            aria-label="View charts"
          />

          {/* Feedback / email — input + COUNT ME IN */}
          <a
            href="mailto:feedback@retroverse.live?subject=Retroverse%20Feedback"
            className="hotspot"
            style={{
              top: "84%",
              left: "38%",
              width: "55%",
              height: "10%",
            }}
            aria-label="Send feedback by email"
          />
        </div>
      </div>
    </main>
  );
}
