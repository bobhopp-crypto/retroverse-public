import type { Metadata } from "next";

import SearchClient from "./search-client";
import { localPublicTraceEnabled } from "@/lib/public/local-trace";

export const metadata: Metadata = {
  title: "Search — Retroverse",
  description: "Search songs, artists, albums, and years in Retroverse.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);
  return <SearchClient traceEnabled={traceEnabled} />;
}
