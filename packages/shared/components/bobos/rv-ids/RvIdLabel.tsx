"use client";

import { formatRvId, type RvId } from "@/lib/bobos/rv-ids";
import { useShowRvIds } from "@/lib/bobos/use-show-rv-ids";

import "./rv-id.css";

type Props = {
  rvId?: RvId | null;
  label: string;
  className?: string;
};

export function RvIdLabel({ rvId, label, className }: Props) {
  const [show] = useShowRvIds();

  if (show && rvId) {
    return (
      <span className={className}>
        <span className="rv-id-badge">{formatRvId(rvId)}</span> {label}
      </span>
    );
  }

  return <span className={className}>{label}</span>;
}
