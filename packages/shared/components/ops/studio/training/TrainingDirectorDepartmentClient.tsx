"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { DirectorTrainingPayload } from "@/lib/ops/studio/director/coaching/types";
import type { TrainingSongSnapshot } from "@/lib/ops/studio/training/types";

import { TrainingDepartmentPanel } from "./TrainingDepartmentPanel";
import { TrainingDirectorCoachingPanel } from "./TrainingDirectorCoachingPanel";
import { TrainingPipelineNav } from "./TrainingPipelineNav";

type Props = {
  initial: TrainingSongSnapshot;
  directorPayload: DirectorTrainingPayload;
};

export function TrainingDirectorDepartmentClient({ initial, directorPayload }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const deptSnap = snapshot.departments.find((d) => d.department === "director");

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ops/studio/training/${snapshot.rvtr}`);
    const data = (await res.json()) as { ok?: boolean; snapshot?: TrainingSongSnapshot };
    if (data.ok && data.snapshot) {
      setSnapshot(data.snapshot);
      router.refresh();
    }
  }, [router, snapshot.rvtr]);

  if (!deptSnap) return null;

  return (
    <>
      <TrainingPipelineNav
        rvtr={snapshot.rvtr}
        artist={snapshot.artist}
        title={snapshot.title}
        departments={snapshot.departments}
      />
      <TrainingDepartmentPanel rvtr={snapshot.rvtr} snapshot={deptSnap} onReviewSaved={refresh} />
      <TrainingDirectorCoachingPanel
        rvtr={snapshot.rvtr}
        initial={directorPayload}
        onSaved={refresh}
      />
    </>
  );
}
