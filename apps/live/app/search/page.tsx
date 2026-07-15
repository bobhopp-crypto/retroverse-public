import type { Metadata } from "next";

import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search songs, artists, albums, and years in Retroverse.",
};

export default function SearchPage() {
  return <SearchClient />;
}
