import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Retroverse | Music across the decades",
  description:
    "Explore songs, artists, and chart history across the decades, with a live current-song feed.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const shellStyles = `
  html:has(.retroverse-discover-frame),
  body:has(.retroverse-discover-frame) {
    height: 100%;
    min-height: 100%;
    overflow: hidden;
  }
  body:has(.retroverse-discover-frame) .rv-global-nav,
  body:has(.retroverse-discover-frame) .arvey-trigger,
  body:has(.retroverse-discover-frame) .live-request__badge {
    display: none !important;
  }
  .retroverse-discover-frame {
    display: block;
    width: 100%;
    height: 100vh;
    height: 100dvh;
    min-height: 100%;
    border: 0;
  }
`;

export default function HomePage() {
  return (
    <>
      <style>{shellStyles}</style>
      <iframe
        className="retroverse-discover-frame"
        title="Retroverse music and decade catalog"
        src="/retroverse-discover/index.html"
      />
    </>
  );
}
