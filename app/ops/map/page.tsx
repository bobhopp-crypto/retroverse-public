import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RetroverseMapBoard } from "@/components/ops/RetroverseMapBoard";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadRetroverseMap } from "@/lib/ops/retroverse-map-store";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Map — Command Center",
  robots: { index: false, follow: false },
};

export default async function RetroverseMapPage() {
  if (!isOpsEnabled()) notFound();

  const map = await loadRetroverseMap();

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <RetroverseMapBoard initialCards={map.cards} />
      </div>
    </main>
  );
}
