import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { loadIssueGenerationMonitor } from "@/lib/ops/issue-generation-monitor";
import { ensureMagazineHeroFrame, isMagazineHomepageBenchmark } from "@/lib/ops/issue-generation/magazine-hero-frame";

import {
  FactoryHomepagePreview,
  loadFactoryHomepagePreviewProps,
} from "../../FactoryHomepagePreview";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export default async function FactoryHomepagePreviewPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();
  const { rvtr: rvtrParam } = await params;
  const rvtr = rvtrParam.toUpperCase();
  if (!/^RVTR\d{6}$/.test(rvtr)) notFound();

  if (isMagazineHomepageBenchmark(rvtr)) {
    await ensureMagazineHeroFrame(rvtr);
  }

  const [props, monitor] = await Promise.all([
    loadFactoryHomepagePreviewProps(rvtr),
    loadIssueGenerationMonitor(),
  ]);
  const job = monitor.jobs.find((entry) => entry.rvtr === rvtr);
  const magazineReady = Boolean(job?.magazineHeroFrame?.available);
  if (!magazineReady) notFound();

  return <FactoryHomepagePreview {...props} fullPage />;
}
