import Link from "next/link";

import { resolveStructuredCollectionMode } from "@/lib/ops/media-collections/midnight-special/structured-mode";

type Props = {
  collection?: string;
  episode?: string;
  mode?: string;
};

export async function OpsStructuredCollectionBanner({ collection, episode, mode }: Props) {
  if (mode !== "structured_collection" || collection !== "midnight-special" || !episode) {
    return null;
  }

  const structured = await resolveStructuredCollectionMode(episode);
  if (!structured) return null;

  return (
    <div className="ops-banner" style={{ marginBottom: 16 }}>
      <strong>Structured Collection mode</strong> — chapter markers drive performance candidates.
      Transcription not required for review.{" "}
      <Link className="ops-link" href={structured.review_href}>
        Open performance review →
      </Link>
      {" · "}Workflow: {structured.steps.join(" → ")}
    </div>
  );
}
