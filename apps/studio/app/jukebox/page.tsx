import type { Metadata, Viewport } from "next";

import { VideoJukebox } from "./VideoJukebox";

import "./jukebox.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Video Jukebox — Retroverse",
  description: "Request a music video from tonight's Retroverse collection.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Retroverse Jukebox",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09070b",
};

export default function JukeboxPage() {
  return <VideoJukebox />;
}
