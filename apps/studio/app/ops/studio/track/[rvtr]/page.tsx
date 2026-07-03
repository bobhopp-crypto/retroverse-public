import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductionTrackerView } from "@/components/ops/studio/production-tracker";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadProductionTrackerSnapshot } from "@/lib/ops/studio/production-tracker/load-production-tracker";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../production-tracker.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const snapshot = await loadProductionTrackerSnapshot(rvtr);
  if (!snapshot) {
    return { title: "Follow This Song — Retroverse Studio" };
  }
  return {
    title: `${snapshot.title} — Follow This Song · Retroverse Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function ProductionTrackerPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const snapshot = await loadProductionTrackerSnapshot(rvtr);
  if (!snapshot) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="dashboard">
          <ProductionTrackerView snapshot={snapshot} />
        </StudioShell>
      </div>
    </main>
  );
}
