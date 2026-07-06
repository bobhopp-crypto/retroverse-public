"use client";

import { usePathname } from "next/navigation";

import { getRvIdByPathname, type RvId } from "@/lib/bobos/rv-ids";

import { RvIdPageTitle } from "./RvIdPageTitle";

type Props = {
  label: string;
  rvId?: RvId | null;
  className?: string;
};

/** Resolves RV ID from explicit prop or current pathname via registry. */
export function OpsPathPageTitle({ label, rvId, className }: Props) {
  const pathname = usePathname();
  const resolved = rvId ?? getRvIdByPathname(pathname);

  return <RvIdPageTitle rvId={resolved} label={label} className={className} />;
}
