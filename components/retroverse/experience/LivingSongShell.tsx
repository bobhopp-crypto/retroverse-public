"use client";

import { AttractTourProvider } from "@/components/retroverse/experience/AttractTourProvider";
import { PlaybackSyncProvider } from "@/components/retroverse/experience/PlaybackSyncProvider";
import type { ReactNode } from "react";

type Props = {
  rvtr: string;
  durationSec: number;
  storyScore: number;
  openingKind?: import("@/lib/retroverse/experience/experience-types").ExperienceChapterKind;
  children: ReactNode;
};

/** Song page shell: attract tour + living song playback sync. */
export function LivingSongShell({ rvtr, durationSec, storyScore, openingKind, children }: Props) {
  return (
    <AttractTourProvider rvtr={rvtr} storyScore={storyScore} openingKind={openingKind}>
      <PlaybackSyncProvider rvtr={rvtr} durationSec={durationSec}>
        {children}
      </PlaybackSyncProvider>
    </AttractTourProvider>
  );
}
