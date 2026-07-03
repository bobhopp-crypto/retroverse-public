import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CreativeReviewView } from "@/components/ops/studio/creative-review";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { loadCreativeReviewSnapshot } from "@/lib/ops/studio/creative-review/store";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../creative-review.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const snapshot = await loadCreativeReviewSnapshot(rvtr);
  if (!snapshot) {
    return { title: "Creative Review — Retroverse Studio" };
  }
  return {
    title: `${snapshot.title} — Creative Review · Retroverse Studio`,
    robots: { index: false, follow: false },
  };
}

export default async function CreativeReviewPage({ params }: Props) {
  if (!isOpsEnabled()) notFound();

  const { rvtr } = await params;
  const snapshot = await loadCreativeReviewSnapshot(rvtr, { refresh: true });
  if (!snapshot) notFound();

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="creative-review" lead="Critique experiences before publishing — never create facts, stories, or pages.">
          <CreativeReviewView snapshot={snapshot} />
        </StudioShell>
      </div>
    </main>
  );
}
