import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { resolveYearOnlySearchHref } from "@/lib/rv-year/rv-year-intent";

import SearchClient from "./search-client";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search artists, albums, and songs across music history.",
};

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

function firstQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0]?.trim() ?? "";
  return value?.trim() ?? "";
}

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

export default async function SearchPage({ searchParams }: Props) {
  const q = firstQueryParam((await searchParams).q);
  const yearHref = resolveYearOnlySearchHref(q);
  if (yearHref) redirect(yearHref);

  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchClient />
    </Suspense>
  );
}
