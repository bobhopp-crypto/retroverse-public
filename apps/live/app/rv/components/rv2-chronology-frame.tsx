"use client";

import type { ReactNode } from "react";

import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";

import "./rv-rv2-overrides.css";

type Props = {
  rvYear: number;
  children: ReactNode;
};

export function Rv2ChronologyFrame({ rvYear, children }: Props) {
  return (
    <Rv2PublicShell
      className="rv2-charts"
      yearsHref={`/rv/${rvYear}`}
      chartsHref="/retroverse-2/charts"
      activeNav="charts"
    >
      <div className="rv2-chronology">{children}</div>
    </Rv2PublicShell>
  );
}
