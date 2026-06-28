import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioShell } from "@/components/ops/studio/StudioShell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../creative-review.css";

export const dynamic = "force-dynamic";

export default function CreativeReviewIndexPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell
          active="creative-review"
          lead="Critique Director storyboards before publishing. Open a song by RVTR."
        >
          <div className="rs-cr__section">
            <h2 className="rs-cr__title" style={{ fontSize: "1.25rem" }}>
              Creative Review
            </h2>
            <p className="rs-cr__narrative">
              Mission Control sends completed storyboards here before Publisher. Example:{" "}
              <Link href="/ops/studio/creative-review/RVTR001341" className="rs-cr__link">
                RVTR001341
              </Link>
            </p>
          </div>
        </StudioShell>
      </div>
    </main>
  );
}
