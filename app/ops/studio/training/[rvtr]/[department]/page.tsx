import Link from "next/link";
import { notFound } from "next/navigation";

import {
  TrainingDepartmentClient,
  TrainingDepartmentPanel,
  TrainingPipelineNav,
  TrainingRendererPreview,
} from "@/components/ops/studio/training";
import { TrainingDirectorDepartmentClient } from "@/components/ops/studio/training/TrainingDirectorDepartmentClient";
import { buildDirectorTrainingPayload } from "@/lib/ops/studio/director/coaching";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { buildTrainingSongSnapshot } from "@/lib/ops/studio/training/build-snapshot";
import { TRAINING_DEPARTMENTS, type TrainingDepartmentId } from "@/lib/ops/studio/training/types";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { normalizeRvtr } from "@/lib/studio/status";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string; department: string }>;
};

function isDepartment(value: string): value is TrainingDepartmentId {
  return TRAINING_DEPARTMENTS.includes(value as TrainingDepartmentId);
}

export async function generateMetadata({ params }: Props) {
  const { rvtr, department } = await params;
  return { title: `${department} training — ${rvtr}` };
}

export default async function TrainingDepartmentPage({ params }: Props) {
  const { rvtr: rvtrParam, department: deptParam } = await params;
  const rvtr = normalizeRvtr(rvtrParam);
  if (!rvtr || !isDepartment(deptParam)) notFound();

  const snapshot = await buildTrainingSongSnapshot(rvtr);
  if (!snapshot) notFound();

  const deptSnap = snapshot.departments.find((d) => d.department === deptParam);
  if (!deptSnap) notFound();

  const deptIndex = TRAINING_DEPARTMENTS.indexOf(deptParam);
  const nextDept = TRAINING_DEPARTMENTS[deptIndex + 1];
  const shellActive =
    deptParam === "collector" || deptParam === "editor" || deptParam === "director" || deptParam === "publisher"
      ? deptParam
      : "dashboard";
  const guidePage = shellActive === "dashboard" ? "dashboard" : shellActive;

  if (deptParam === "director") {
    const directorPayload = await buildDirectorTrainingPayload(rvtr);
    if (!directorPayload) notFound();

    return (
      <StudioShell
        active={shellActive}
        guidePage={guidePage}
        title="Director Training"
        lead="Exhibit coaching · frame ranking · A/B plan comparison"
      >
        <StudioGuideChrome pageId={guidePage} />
        <TrainingDirectorDepartmentClient initial={snapshot} directorPayload={directorPayload} />
        {nextDept ? (
          <p className="rs-training-next">
            <Link href={`/ops/studio/training/${rvtr}/${nextDept}`}>Continue to {nextDept} →</Link>
          </p>
        ) : null}
        <p className="rs-training-workspace-link">
          Open full workspace:{" "}
          <Link href={`/ops/studio/director?rvtr=${rvtr}`}>director department</Link>
        </p>
      </StudioShell>
    );
  }

  if (deptParam === "renderer") {
    const payload = await loadPublicExperience(rvtr, { bypassPublisherGate: true });
    return (
      <StudioShell active="dashboard" guidePage="dashboard" title="Renderer Training" lead="Patron experience preview.">
        <StudioGuideChrome pageId="dashboard" />
        <TrainingPipelineNav
          rvtr={snapshot.rvtr}
          artist={snapshot.artist}
          title={snapshot.title}
          departments={snapshot.departments}
        />
        <div className="rs-training-renderer-layout">
          <TrainingDepartmentPanel rvtr={rvtr} snapshot={deptSnap} />
          {payload ? (
            <TrainingRendererPreview payload={payload} />
          ) : (
            <p className="rs-training-dept__empty">
              Experience not ready.{" "}
              <Link href={`/ops/studio/training/${rvtr}/director`}>Check Director →</Link>
            </p>
          )}
        </div>
      </StudioShell>
    );
  }

  return (
    <StudioShell
      active={shellActive}
      guidePage={guidePage}
      title={`${deptParam.charAt(0).toUpperCase()}${deptParam.slice(1)} Training`}
      lead="Input · output · decisions · confidence · review"
    >
      <StudioGuideChrome pageId={guidePage} />
      <TrainingDepartmentClient initial={snapshot} department={deptParam} />
      {nextDept ? (
        <p className="rs-training-next">
          <Link href={`/ops/studio/training/${rvtr}/${nextDept}`}>Continue to {nextDept} →</Link>
        </p>
      ) : null}
      <p className="rs-training-workspace-link">
        Open full workspace:{" "}
        {deptParam === "collector" ? (
          <Link href={`/ops/studio/collector/${rvtr}`}>Collector package</Link>
        ) : deptParam === "editor" ? (
          <Link href={`/ops/studio/editor/${rvtr}`}>Editor office</Link>
        ) : deptParam === "publisher" ? (
          <Link href={`/ops/studio/publisher/${rvtr}`}>Publisher review</Link>
        ) : (
          <Link href={`/ops/studio/${deptParam}?rvtr=${rvtr}`}>{deptParam} department</Link>
        )}
      </p>
    </StudioShell>
  );
}
