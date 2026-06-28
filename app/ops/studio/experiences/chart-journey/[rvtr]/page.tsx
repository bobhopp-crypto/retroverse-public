import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChartJourneyWorkspace } from "@/components/experiences/chart-journey/ChartJourneyWorkspace";
import { loadChartJourneyWorkspace } from "@/lib/experiences/chart-journey";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./chart-journey-workspace.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const payload = await loadChartJourneyWorkspace(rvtr);
  if (!payload?.experience) {
    return { title: "Chart Journey — Retroverse Studio" };
  }
  return {
    title: `${payload.experience.title} — Chart Journey · Retroverse Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function ChartJourneyWorkspacePage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const payload = await loadChartJourneyWorkspace(rvtr);

  if (!payload) notFound();

  if (!payload.hasChartData || !payload.experience) {
    return (
      <main className="ops-page ops-command ops-studio-page cj-landing">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <h1>Chart Journey</h1>
          <p>
            No chart trajectory for <strong>{rvtr.toUpperCase()}</strong>. This experience requires Hot 100 weeks.
          </p>
          <p>
            <Link href="/ops/studio/experiences/chart-journey">← Chart Journey workspace</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <p className="cj-landing__back">
          <Link href="/ops/studio/experiences/chart-journey">← Chart Journey workspace</Link>
        </p>
        <ChartJourneyWorkspace experience={payload.experience} />
      </div>
    </main>
  );
}
