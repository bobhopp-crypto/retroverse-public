import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AllStarReviewPanel } from "@/components/ops/allstar/AllStarReviewPanel";
import { AllStarShell } from "@/components/ops/allstar/AllStarShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops.css";
import "../allstar.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disc Review",
  robots: { index: false, follow: false },
};

export default function AllStarReviewPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-allstar-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <AllStarShell
          active="review"
          title="Disc Review"
          lead="Rapid validation — scan, review image, OCR. Target under 10 seconds per disc."
        >
          <AllStarReviewPanel />
        </AllStarShell>
      </div>
    </main>
  );
}
