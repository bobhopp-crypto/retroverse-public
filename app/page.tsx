import "./home.css";

export default function HomePage() {
  return (
    <main className="home-main">
      <div className="poster-shell">
        <div className="poster-frame">
          <img
            className="poster-image"
            src="/retroverse-home.png?v=2"
            alt="Retroverse — Time is not a list. It's a place."
            width={1024}
            height={1536}
            fetchPriority="high"
          />

          {/* 1. SEARCH — dark teal panel + search bar */}
          <a
            href="/search"
            className="hotspot hotspot--search"
            style={{
              top: "22.5%",
              left: "5%",
              width: "90%",
              height: "16%",
            }}
            aria-label="Search Retroverse"
          />

          {/* 2. CHARTS — VIEW CHARTS button */}
          <a
            href="#/charts-placeholder"
            className="hotspot"
            style={{
              top: "51%",
              left: "45%",
              width: "34%",
              height: "5.5%",
            }}
            aria-label="View charts"
          />

          {/* 3. BROWSE ALBUM COVERS button */}
          <a
            href="#/albums-placeholder"
            className="hotspot"
            style={{
              top: "76%",
              left: "45%",
              width: "38%",
              height: "5.5%",
            }}
            aria-label="Browse album covers"
          />

          {/* 4. FEEDBACK — email input + sign up row */}
          <a
            href="mailto:feedback@retroverse.live?subject=Retroverse%20Feedback"
            className="hotspot"
            style={{
              top: "82.5%",
              left: "5%",
              width: "90%",
              height: "13%",
            }}
            aria-label="Send feedback by email"
          />
        </div>
      </div>
    </main>
  );
}
