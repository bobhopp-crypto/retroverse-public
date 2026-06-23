import type { Metadata } from "next";
import { Suspense } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search artists, albums, and songs across music history.",
};

function SearchPageFallback() {
  return (
    <Rv2PublicShell className="rv2-search">
      <div className="search-page" aria-busy="true">
        <div className="search-page__inner">
          <p className="search-idle__lead">Opening the stacks…</p>
        </div>
      </div>
    </Rv2PublicShell>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchClient />
    </Suspense>
  );
}
