import Link from "next/link";
import { notFound } from "next/navigation";

import { PublisherReviewClient } from "@/components/ops/studio/publisher";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { goldenStatusForRvtr } from "@/lib/ops/studio/publisher/experience/golden";
import { evaluatePublisherPackage } from "@/lib/ops/studio/publisher/evaluate";
import { ensurePublisherEvaluation } from "@/lib/ops/studio/publisher/list-packages";
import { loadVisualProduction } from "@/lib/ops/studio/publisher/visual-producer";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { normalizeRvtr } from "@/lib/studio/status";

import "../publisher.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { rvtr } = await params;
  return { title: `Publisher review — ${rvtr}` };
}

export default async function PublisherReviewPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr: rvtrParam } = await params;
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr) notFound();

  const [record, director, preview, visualProduction] = await Promise.all([
    ensurePublisherEvaluation(rvtr),
    loadDirectorPackage(rvtr),
    loadPublicExperience(rvtr, { bypassPublisherGate: true }),
    loadVisualProduction(rvtr),
  ]);

  if (!director) {
    return (
      <main className="ops-page ops-command ops-studio-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <StudioShell active="publisher" guidePage="publisher" lead="Editorial review workspace">
            <StudioGuideChrome pageId="publisher" />
            <div className="rs-publisher-review">
              <p className="rs-publisher-review__rvtr">{rvtr}</p>
              <h1 className="rs-publisher-review__title">Director output missing</h1>
              <p className="rs-publisher-review__why">
                Publisher cannot review this song until Director has written a render specification.
              </p>
              <p>
                <Link href="/ops/studio/publisher">← Back to Publisher board</Link>
              </p>
            </div>
          </StudioShell>
        </div>
      </main>
    );
  }

  const resolvedRecord = record ?? (await evaluatePublisherPackage(rvtr));
  if (!resolvedRecord) {
    return (
      <main className="ops-page ops-command ops-studio-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <StudioShell active="publisher" guidePage="publisher" lead="Editorial review workspace">
            <StudioGuideChrome pageId="publisher" />
            <div className="rs-publisher-review">
              <p className="rs-publisher-review__rvtr">{rvtr}</p>
              <h1 className="rs-publisher-review__title">Evaluation unavailable</h1>
              <p className="rs-publisher-review__why">
                Director render spec exists but Publisher evaluation could not be generated.
              </p>
              <p>
                <Link href="/ops/studio/publisher">← Back to Publisher board</Link>
              </p>
            </div>
          </StudioShell>
        </div>
      </main>
    );
  }

  const goldenStatus = await goldenStatusForRvtr(rvtr);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="publisher" guidePage="publisher" lead="Editorial review workspace">
          <StudioGuideChrome pageId="publisher" />
          <PublisherReviewClient
            record={resolvedRecord}
            director={director}
            preview={preview}
            visualProduction={visualProduction}
            isGolden={goldenStatus.isGolden}
          />
        </StudioShell>
      </div>
    </main>
  );
}
