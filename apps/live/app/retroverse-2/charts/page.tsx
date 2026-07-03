import type { Metadata } from "next";

import { ChartsHubClient } from "./charts-hub-client";

export const metadata: Metadata = {
  title: "Charts — Retroverse",
  description: "Hot 100 singles, Top 200 albums, and browse-by-year chart history.",
};

export default function Retroverse2ChartsPage() {
  return <ChartsHubClient />;
}
