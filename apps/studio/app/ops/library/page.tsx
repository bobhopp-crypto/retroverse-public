import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductionLibraryBrowser } from "@/components/ops/library/ProductionLibraryBrowser";
import { loadProductionLibrary } from "@/lib/ops/library/load-production-library";
import type { LibraryFilterId } from "@/lib/ops/library/types";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Library — Retroverse Production",
  robots: { index: false, follow: false },
};

const FILTER_ALIASES: Record<string, LibraryFilterId> = {
  needs_work: "needs_work",
  "needs-work": "needs_work",
  ready: "ready",
  published: "published",
};

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function ProductionLibraryPage({ searchParams }: Props) {
  if (!isOpsEnabled()) notFound();

  const params = await searchParams;
  const rawFilter = params.filter?.trim().toLowerCase() ?? "";
  const initialFilter = FILTER_ALIASES[rawFilter] ?? null;

  const data = await loadProductionLibrary();

  return <ProductionLibraryBrowser data={data} initialFilter={initialFilter} />;
}
