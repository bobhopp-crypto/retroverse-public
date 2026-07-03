import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarAuditPanel } from "@/components/ops/allstar/AllStarAuditPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Collection Audit",
  robots: { index: false, follow: false },
};

export default function AllStarAuditPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="audit"
          title="Collection Audit"
          lead="One-click health report — missing artifacts, OCR and geometry failures, duplicates."
        >
          <AllStarAuditPanel />
        </AllStarShell>
      </div>
    </main>
  );
}
