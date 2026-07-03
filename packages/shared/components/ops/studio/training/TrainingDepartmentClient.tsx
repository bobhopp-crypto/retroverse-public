"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import type { TrainingSongSnapshot } from "@/lib/ops/studio/training/types";

import { TrainingDepartmentPanel } from "./TrainingDepartmentPanel";
import { TrainingPipelineNav } from "./TrainingPipelineNav";

type Props = {
  initial: TrainingSongSnapshot;
  department: TrainingSongSnapshot["departments"][number]["department"];
};

export function TrainingDepartmentClient({ initial, department }: Props) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initial);
  const deptSnap = snapshot.departments.find((d) => d.department === department);

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
    </>
  );
}
