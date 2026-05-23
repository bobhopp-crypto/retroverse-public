import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search artists, albums, and songs across music history.",
};

function SearchPageFallback() {
  return (
    <div className="search-page" aria-busy="true">
      <div className="search-page__inner">
        <header className="search-hero search-hero--boot">
          <p className="search-idle__lead">Opening the stacks…</p>
        </header>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchClient />
    </Suspense>
  );
}
