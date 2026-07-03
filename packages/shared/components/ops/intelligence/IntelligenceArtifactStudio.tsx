import Link from "next/link";

import type { ArtifactStudioModel } from "@/lib/ops/intelligence/artifact-view-model";

import { RecordLabelCard } from "./artifacts/RecordLabelCard";
import { SongDNACard } from "./artifacts/SongDNACard";
import { StoryConstellation } from "./artifacts/StoryConstellation";
import { TimelineInfographic } from "./artifacts/TimelineInfographic";

type Props = {
  model: ArtifactStudioModel;
};

const ARTIFACTS = [
  { title: "Record Label Card", Component: RecordLabelCard },
  { title: "Timeline Infographic", Component: TimelineInfographic },
  { title: "Story Constellation", Component: StoryConstellation },
  { title: "Song DNA", Component: SongDNACard },
] as const;

export function IntelligenceArtifactStudio({ model }: Props) {
  return (
    <div className="intel-artifact-studio">
      <Link
        className="intel-review__back"
        href={`/ops/intelligence/package/${model.rvtr}`}
        prefetch={false}
      >
        ← Package
      </Link>

      <header className="intel-artifact-studio__hero">
        <p className="intel-package-hero__kicker">Artifact Studio</p>
        <h1 className="intel-package-hero__title">{model.title}</h1>
        <p className="intel-package-hero__artist">{model.artist}</p>
      </header>

      {ARTIFACTS.map(({ title, Component }) => (
        <section key={title} className="intel-artifact-render">
          <h2 className="intel-artifact-render__title">{title}</h2>
          <Component model={model} />
        </section>
      ))}
    </div>
  );
}
