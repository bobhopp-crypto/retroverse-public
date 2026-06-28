"use client";

import type { ComponentType } from "react";

import { ExperienceImage } from "@/components/retroverse/renderer/ExperienceImage";
import type { CollectorSongDna } from "@/lib/ops/studio/collector/song-dna-types";
import {
  allTimelineEvents,
  identifiedFactTexts,
  identifiedTimelineEvents,
  sceneFact,
  scenePrimaryImage,
  sceneQuote,
  templateLabel,
} from "@/lib/retroverse/experience-lab/scene-helpers";
import type { LabLayoutId, LabSceneContext } from "@/lib/retroverse/experience-lab/types";
import type { RenderSpecMetadata, RenderSpecScene } from "@/lib/retroverse/renderer/types";

type LayoutProps = {
  scene: RenderSpecScene;
  metadata: RenderSpecMetadata;
  songDna: CollectorSongDna | null;
  context: LabSceneContext;
};

function LabImage({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  return <ExperienceImage src={src} alt={alt} className={className} priority />;
}

export function MagazineLayout({ scene, metadata }: LayoutProps) {
  const image = scenePrimaryImage(scene);
  return (
    <article className="elab-layout elab-layout--magazine">
      <p className="elab-layout__eyebrow">{metadata.artist}</p>
      <div className="elab-layout__hero">
        <LabImage src={image} alt={scene.headline} className="elab-layout__image elab-layout__image--hero" />
      </div>
      <h1 className="elab-layout__headline">{scene.headline}</h1>
      {scene.supportingCopy ? <p className="elab-layout__deck">{scene.supportingCopy}</p> : null}
      {identifiedFactTexts("magazine", scene).map((fact) => (
        <p key={fact.id} className="elab-layout__pull">{fact.text}</p>
      ))}
    </article>
  );
}

export function DocumentaryLayout({ scene, metadata }: LayoutProps) {
  const image = scenePrimaryImage(scene);
  return (
    <article className="elab-layout elab-layout--documentary">
      <header className="elab-layout__doc-header">
        <span className="elab-layout__chapter">Scene {scene.sceneNumber}</span>
        <h1 className="elab-layout__headline">{scene.headline}</h1>
      </header>
      <LabImage src={image} alt={scene.headline} className="elab-layout__image elab-layout__image--cinema" />
      {scene.supportingCopy ? <p className="elab-layout__caption">{scene.supportingCopy}</p> : null}
      {scene.assets.timelineEvents.length > 0 ? (
        <ul className="elab-layout__doc-events">
          {identifiedTimelineEvents("doc", scene).map((event) => (
            <li key={event.id}>{event.text}</li>
          ))}
        </ul>
      ) : null}
      <footer className="elab-layout__doc-footer">{metadata.title} · {metadata.artist}</footer>
    </article>
  );
}

export function PerformanceLayout({ scene, metadata, songDna }: LayoutProps) {
  const image = scenePrimaryImage(scene) ?? scene.assets.imageUrls[1] ?? null;
  const prompt = scene.narrativePurpose || scene.headline;
  return (
    <article className="elab-layout elab-layout--performance">
      <div className="elab-layout__perf-badge">Watch this moment</div>
      <LabImage src={image} alt={prompt} className="elab-layout__image elab-layout__image--perf" />
      <h1 className="elab-layout__headline elab-layout__headline--compact">{scene.headline}</h1>
      <p className="elab-layout__perf-prompt">{prompt}</p>
      {songDna?.visual?.lightingStyle ? (
        <p className="elab-layout__dna-tag">{songDna.visual.lightingStyle.replace(/_/g, " ")}</p>
      ) : null}
      <p className="elab-layout__meta">{metadata.artist}</p>
    </article>
  );
}

export function CollectorLayout({ scene, metadata }: LayoutProps) {
  const image = scenePrimaryImage(scene);
  const fact = sceneFact(scene);
  return (
    <article className="elab-layout elab-layout--collector">
      <div className="elab-card">
        <div className="elab-card__frame">
          <LabImage src={image} alt={scene.headline} className="elab-layout__image elab-layout__image--card" />
        </div>
        <div className="elab-card__body">
          <div className="elab-card__badges">
            <span className="elab-badge">{templateLabel(scene.templateId)}</span>
            <span className="elab-badge elab-badge--accent">{scene.importance}</span>
            {scene.durationSec ? <span className="elab-badge">{scene.durationSec}s</span> : null}
          </div>
          <h1 className="elab-layout__headline elab-layout__headline--card">{scene.headline}</h1>
          {scene.supportingCopy ? <p className="elab-layout__stat">{scene.supportingCopy}</p> : null}
          {fact ? <p className="elab-layout__fact">{fact}</p> : null}
          <p className="elab-layout__meta">{metadata.artist} — {metadata.title}</p>
        </div>
      </div>
    </article>
  );
}

export function TimelineLayout({ scene, metadata, context }: LayoutProps) {
  const events = allTimelineEvents(context.allScenes);
  const image = scenePrimaryImage(scene);
  return (
    <article className="elab-layout elab-layout--timeline">
      <h1 className="elab-layout__headline">{scene.headline}</h1>
      {scene.supportingCopy ? <p className="elab-layout__deck">{scene.supportingCopy}</p> : null}
      <LabImage src={image} alt={scene.headline} className="elab-layout__image elab-layout__image--timeline" />
      <ol className="elab-timeline">
        {events.map((event) => (
          <li
            key={event.id}
            className={event.sceneNumber === scene.sceneNumber ? "elab-timeline__item elab-timeline__item--active" : "elab-timeline__item"}
          >
            {event.year ? <span className="elab-timeline__year">{event.year}</span> : null}
            <span className="elab-timeline__label">{event.label}</span>
          </li>
        ))}
      </ol>
      <p className="elab-layout__meta">{metadata.artist}</p>
    </article>
  );
}

export function MinimalLayout({ scene, metadata }: LayoutProps) {
  const image = scenePrimaryImage(scene);
  const idea = scene.headline;
  const fact = sceneFact(scene);
  const quote = sceneQuote(scene);
  return (
    <article className="elab-layout elab-layout--minimal">
      <LabImage src={image} alt={idea} className="elab-layout__image elab-layout__image--minimal" />
      <h1 className="elab-layout__headline elab-layout__headline--minimal">{idea}</h1>
      {fact ? <p className="elab-layout__minimal-fact">{fact}</p> : null}
      {quote && quote !== fact ? <blockquote className="elab-layout__minimal-quote">{quote}</blockquote> : null}
      <p className="elab-layout__meta elab-layout__meta--minimal">{metadata.artist}</p>
    </article>
  );
}

const LAYOUT_MAP: Record<LabLayoutId, ComponentType<LayoutProps>> = {
  magazine: MagazineLayout,
  documentary: DocumentaryLayout,
  performance: PerformanceLayout,
  collector: CollectorLayout,
  timeline: TimelineLayout,
  minimal: MinimalLayout,
};

export function LabLayoutView({ layoutId, ...props }: LayoutProps & { layoutId: LabLayoutId }) {
  const Component = LAYOUT_MAP[layoutId];
  return <Component {...props} />;
}
