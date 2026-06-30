import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "./event-studio.css";

export const metadata: Metadata = {
  title: "Event Studio — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function EventStudioLayout({ children }: { children: React.ReactNode }) {
  if (!isOpsEnabled()) {
    notFound();
  }

  return children;
}
