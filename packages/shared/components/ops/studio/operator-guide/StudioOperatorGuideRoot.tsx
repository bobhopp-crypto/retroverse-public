"use client";

import type { ReactNode } from "react";

import { TrainingModeProvider } from "@/components/ops/studio/training";

import { OperatorGuideProvider } from "@/components/ops/studio/operator-guide";

import "@/app/ops/studio/operator-guide.css";

export function StudioOperatorGuideRoot({ children }: { children: ReactNode }) {
  return (
    <OperatorGuideProvider>
      <TrainingModeProvider>{children}</TrainingModeProvider>
    </OperatorGuideProvider>
  );
}
