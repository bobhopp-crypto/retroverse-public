import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ExperiencePlayer } from "@/components/retroverse/renderer/ExperiencePlayer";
import { resolveExperiencePublicationBlock } from "@/lib/ops/studio/publisher/gate";
import { getPublisherRecord } from "@/lib/ops/studio/publisher/store";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";

import "./experience.css";

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  const block = await resolveExperiencePublicationBlock(rvtr);
  if (block.kind !== "published") {
    return { title: "Experience — Retroverse" };
  }
  const payload = await loadPublicExperience(rvtr);
  if (!payload) {
    return { title: "Experience — Retroverse" };
  }
  const { artist, title } = payload.experience.spec.metadata;
  return {
    title: `${title} — ${artist} · Retroverse Experience`,
    description: `A curated story experience for ${title} by ${artist}.`,
  };
}

/**
 * Museum-quality showcase experiences live here once Publisher has approved
 * them. For every other state (not ready, unpublished, invalid, or a load
 * failure) this route defers to the canonical Song Experience instead of
 * dead-ending — Retroverse always has *something* richer to show than a
 * "not ready" message.
 */
export default async function ExperiencePage({ params }: Props) {
  const { rvtr } = await params;
  const block = await resolveExperiencePublicationBlock(rvtr);

  if (block.kind === "invalid_rvtr" || block.kind === "not_ready") {
    redirect(`/retroverse-2/song/${encodeURIComponent(rvtr)}`);
  }

  if (block.kind === "unpublished") {
    redirect(`/retroverse-2/song/${block.rvtr}`);
  }

  const payload = await loadPublicExperience(rvtr);
  if (!payload) {
    redirect(`/retroverse-2/song/${encodeURIComponent(rvtr)}`);
  }

  const publisherRecord = await getPublisherRecord(rvtr);
  const publicationBadge =
    publisherRecord?.approvedClass === "showcase"
      ? "showcase"
      : publisherRecord?.approvedClass === "extended"
        ? "extended"
        : null;

  return (
    <div className="rv-exp rv-exp--v02 rv-exp--v03">
      <ExperiencePlayer payload={payload} publicationBadge={publicationBadge} />
    </div>
  );
}
