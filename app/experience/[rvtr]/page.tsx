import type { Metadata } from "next";
import Link from "next/link";

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

function ExperienceNotReady({ message }: { message: string }) {
  return (
    <div className="rv-exp rv-exp--missing">
      <div className="rv-exp-missing">
        <h1 className="rv-exp-missing__title">Experience not ready</h1>
        <p className="rv-exp-missing__body">{message}</p>
      </div>
    </div>
  );
}

function ExperienceUnpublished({ rvtr }: { rvtr: string }) {
  return (
    <div className="rv-exp rv-exp--missing">
      <div className="rv-exp-missing">
        <h1 className="rv-exp-missing__title">Awaiting publication</h1>
        <p className="rv-exp-missing__body">
          This experience has not yet been approved by Publisher.
        </p>
        <Link href={`/ops/studio/publisher/${rvtr}`} className="rv-exp-missing__cta">
          Open Publisher review
        </Link>
      </div>
    </div>
  );
}

export default async function ExperiencePage({ params }: Props) {
  const { rvtr } = await params;
  const block = await resolveExperiencePublicationBlock(rvtr);

  if (block.kind === "invalid_rvtr") {
    return (
      <ExperienceNotReady message="This song identifier is not valid. Check the RVTR and try again." />
    );
  }

  if (block.kind === "not_ready") {
    return (
      <ExperienceNotReady message="Director has not finished the render specification for this song yet." />
    );
  }

  if (block.kind === "unpublished") {
    return <ExperienceUnpublished rvtr={block.rvtr} />;
  }

  const payload = await loadPublicExperience(rvtr);
  if (!payload) {
    return (
      <ExperienceNotReady message="This experience could not be loaded. Check Director output in Studio." />
    );
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
