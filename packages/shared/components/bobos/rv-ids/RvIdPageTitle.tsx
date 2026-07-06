"use client";

import type { RvId } from "@/lib/bobos/rv-ids";
import { RvIdLabel } from "./RvIdLabel";

type Props = {
  rvId?: RvId | null;
  label: string;
  className?: string;
};

/** Page-level h1 with optional RV ID prefix when toggle is on. */
export function RvIdPageTitle({ rvId, label, className }: Props) {
  return (
    <h1 className={className}>
      <RvIdLabel rvId={rvId} label={label} />
    </h1>
  );
}
