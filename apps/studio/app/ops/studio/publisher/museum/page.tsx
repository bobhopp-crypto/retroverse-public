import { notFound } from "next/navigation";

import { MuseumWall } from "@/components/ops/studio/publisher/MuseumWall";
import { StudioGuideChrome } from "@/components/ops/studio/operator-guide";
import { StudioShell } from "@/components/ops/studio/StudioShell";
import { buildMuseumWall } from "@/lib/ops/studio/publisher/experience/museum-wall";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../publisher.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Museum Wall — Publisher",
};

export default async function PublisherMuseumPage() {
  if (!isOpsEnabled()) notFound();

  const entries = await buildMuseumWall(100);

  return (
    <main className="ops-page ops-command ops-studio-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <StudioShell active="publisher" guidePage="publisher" lead="The north star gallery">
          <StudioGuideChrome pageId="publisher" />
          <MuseumWall entries={entries} />
        </StudioShell>
      </div>
    </main>
  );
}
