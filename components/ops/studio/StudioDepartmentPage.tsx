import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StudioDepartmentDetail } from "@/components/ops/studio/StudioDepartmentDetail";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { getStudioDepartment } from "@/lib/ops/studio/departments";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

type NavSlug =
  | "collector"
  | "editor"
  | "director"
  | "publisher"
  | "visual-analysis"
  | "audio-analysis"
  | "quality-control";

type Props = {
  slug: NavSlug;
};

export function studioDepartmentMetadata(slug: NavSlug): Metadata {
  const dept = getStudioDepartment(slug);
  return {
    title: dept ? `${dept.name} — Studio` : "Studio — Retroverse Ops",
    robots: { index: false, follow: false },
  };
}

export function StudioDepartmentPage({ slug }: Props) {
  if (!isOpsEnabled()) notFound();

  const dept = getStudioDepartment(slug);
  if (!dept) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active={slug} lead={dept.mission}>
          <StudioDepartmentDetail dept={dept} />
        </StudioShell>
      </div>
    </main>
  );
}
