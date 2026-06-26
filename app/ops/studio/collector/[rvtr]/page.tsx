import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CollectorPackageMissing } from "@/components/ops/studio/CollectorPackageMissing";
import { CollectorPackageView } from "@/components/ops/studio/CollectorPackageView";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadCollectorPackagePageContext } from "@/lib/ops/studio/collector/load-library";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

const getCollectorPackagePageContext = cache(loadCollectorPackagePageContext);

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const context = await getCollectorPackagePageContext(rvtr);
  const label = context.package
    ? `${context.package.artist} — ${context.package.title}`
    : rvtr.toUpperCase();

  return {
    title: `${label} — Collector`,
    robots: { index: false, follow: false },
  };
}

export default async function CollectorPackagePage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment("collector");
  if (!dept) notFound();

  const { rvtr } = await params;
  const context = await getCollectorPackagePageContext(rvtr);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="collector" lead={dept.mission}>
          {context.package && context.investigation ? (
            <CollectorPackageView initialContext={context} />
          ) : (
            <CollectorPackageMissing rvtr={context.rvtr} />
          )}
        </StudioShell>
      </div>
    </main>
  );
}
