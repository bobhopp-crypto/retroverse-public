import type { Metadata } from "next";

import "./atlas.css";

export const metadata: Metadata = {
  title: "Atlas — Retroverse",
  robots: { index: false, follow: false },
};

export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return <main className="atlas-root">{children}</main>;
}
