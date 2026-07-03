"use client";

import { ChartJourneyInstallation } from "@/components/retroverse/experience/ChartJourneyInstallation";
import { ExperienceImage } from "./ExperienceImage";
import {
  imageTreatmentClass,
  isMuseumLayout,
  layoutClass,
  type PresentableScene,
} from "@/lib/retroverse/renderer/scene-presentation";
import { sanitizeMomentCopy } from "@/lib/retroverse/scene-composer/scene-metrics";
import type { RenderSpecMetadata } from "@/lib/retroverse/renderer/types";

type Props = {
  scene: PresentableScene;
  metadata: RenderSpecMetadata;
  performanceTitle: string;
  museumV3?: boolean;
};

function primaryImage(scene: PresentableScene): string | null {
  return scene.assets.imageUrls[0] ?? null;
}

function focusedBody(scene: PresentableScene): string | null {
  if (isMuseumLayout(scene.presentationLayout)) return null;

  const fact = scene.assets.factTexts.find((f) => f.trim()) ?? null;
  const maxWords =
    scene.presentationLayout === "minimal_fact" || scene.presentationLayout === "chart" ? 14 : 18;

  if (fact && scene.momentType === "did_you_know") return sanitizeMomentCopy(fact, maxWords);
  if (fact && scene.momentType === "chart_milestone") return sanitizeMomentCopy(fact, 14);
  if (fact && !scene.supportingCopy.trim()) return sanitizeMomentCopy(fact, maxWords);

  const copy = sanitizeMomentCopy(scene.supportingCopy.trim(), maxWords);
  if (copy && copy !== scene.headline) return copy;

  if (scene.presentationLayout === "fullscreen" || scene.momentType === "visual_break") {
    return null;
  }

  const narrative = sanitizeMomentCopy(scene.narrativePurpose.trim(), maxWords);
  if (
    narrative &&
    narrative !== scene.headline &&
    narrative !== copy &&
    scene.momentType === "performance_spotlight"
  ) {
    return narrative;
  }

  if (fact && scene.momentType !== "hero_moment") return sanitizeMomentCopy(fact, maxWords);
  return copy || null;
}

function watchPrompt(scene: PresentableScene): string | null {
  if (isMuseumLayout(scene.presentationLayout)) return null;
  if (scene.presentationLayout === "fullscreen") return null;
  if (scene.momentType === "performance_spotlight") return "Watch this moment";
  if (scene.momentType === "visual_break") return null;
  if (scene.momentType === "pause_moment") return null;
  return null;
}

function showMomentLabel(scene: PresentableScene): boolean {
  if (isMuseumLayout(scene.presentationLayout)) return false;
  return scene.presentationLayout !== "fullscreen" && scene.momentType !== "visual_break";
}

function MuseumIdentityScene({
  scene,
  metadata,
  museumV3,
}: {
  scene: PresentableScene;
  metadata: RenderSpecMetadata;
  museumV3?: boolean;
}) {
  const cover = scene.coverUrl;

  return (
    <div className={`rv-exp-museum rv-exp-museum--identity ${museumV3 ? "rv-exp-museum--v3" : ""}`}>
      <div className="rv-exp-museum__light" aria-hidden />
      {cover ? (
        <div className="rv-exp-museum__cover-wrap">
          <ExperienceImage
            src={cover}
            alt={`${metadata.title} album cover`}
            className="rv-exp-museum__cover"
            priority
          />
        </div>
      ) : null}
      <div className="rv-exp-museum__identity-copy">
        <p className="rv-exp-museum__artist">{metadata.artist}</p>
        <h2 className="rv-exp-museum__title">{metadata.title}</h2>
        {scene.releaseYear ? (
          <p className="rv-exp-museum__year">{scene.releaseYear}</p>
        ) : null}
        {scene.showcaseBadge && !museumV3 ? (
          <span className="rv-exp-museum__badge">Showcase</span>
        ) : null}
      </div>
    </div>
  );
}

function MuseumPerformanceScene({ scene, museumV3 }: { scene: PresentableScene; museumV3?: boolean }) {
  const image = primaryImage(scene);
  const treatmentClass = imageTreatmentClass(scene.imageTreatment);

  return (
    <div className={`rv-exp-museum rv-exp-museum--performance ${museumV3 ? "rv-exp-museum--v3" : ""}`}>
      <div className="rv-exp-museum__concert-glow" aria-hidden />
      {image ? (
        <ExperienceImage
          src={image}
          alt=""
          className={`rv-exp-museum__frame ${treatmentClass}`.trim()}
          priority
        />
      ) : null}
    </div>
  );
}

function MuseumDnaScene({ scene, museumV3 }: { scene: PresentableScene; museumV3?: boolean }) {
  const svg = scene.dnaWatercolorSvg;
  if (!svg) return null;

  const quoteText = scene.museumDnaQuoteText?.trim() ?? "";
  const attribution = scene.museumDnaQuoteAttribution?.trim() ?? "";
  const hasQuote = quoteText.length > 0;

  return (
    <div
      className={`rv-exp-museum rv-exp-museum--dna ${museumV3 ? "rv-exp-museum--v3" : ""}`}
      style={{ backgroundImage: `url("${svg}")` }}
    >
      <div className="rv-exp-museum__dna-vignette" aria-hidden />
      <div className="rv-exp-museum__dna-quote-panel">
        {hasQuote ? (
          <>
            <blockquote className="rv-exp-museum__dna-quote">{quoteText}</blockquote>
            {attribution ? (
              <p className="rv-exp-museum__dna-attribution">{attribution}</p>
            ) : null}
          </>
        ) : (
          <p className="rv-exp-museum__dna-fallback">No featured quote available.</p>
        )}
      </div>
    </div>
  );
}

function MuseumChartScene({ scene, museumV3 }: { scene: PresentableScene; museumV3?: boolean }) {
  const chart = scene.museumChart;

  return (
    <div className={`rv-exp-museum rv-exp-museum--chart ${museumV3 ? "rv-exp-museum--v3" : ""}`}>
      {chart ? (
        <ChartJourneyInstallation
          {...chart}
          backgroundImageUrl={primaryImage(scene)}
          museumV3={museumV3}
        />
      ) : scene.headline ? (
        <p className="rv-exp-museum__peak">{scene.headline}</p>
      ) : null}
    </div>
  );
}

function MuseumIconicScene({ scene, museumV3 }: { scene: PresentableScene; museumV3?: boolean }) {
  const image = primaryImage(scene);
  const treatmentClass = imageTreatmentClass(scene.imageTreatment);

  return (
    <div className={`rv-exp-museum rv-exp-museum--iconic ${museumV3 ? "rv-exp-museum--v3" : ""}`}>
      {image ? (
        <ExperienceImage
          src={image}
          alt=""
          className={`rv-exp-museum__iconic-frame ${treatmentClass}`.trim()}
          priority
        />
      ) : null}
      {!museumV3 && scene.headline?.trim() ? (
        <p className="rv-exp-museum__iconic-caption">{scene.headline.trim()}</p>
      ) : null}
    </div>
  );
}

export function PerformanceCompanionScene({ scene, metadata, performanceTitle, museumV3 = false }: Props) {
  if (scene.presentationLayout === "museum_identity") {
    return <MuseumIdentityScene scene={scene} metadata={metadata} museumV3={museumV3} />;
  }
  if (scene.presentationLayout === "museum_performance") {
    return <MuseumPerformanceScene scene={scene} museumV3={museumV3} />;
  }
  if (scene.presentationLayout === "museum_dna") {
    return <MuseumDnaScene scene={scene} museumV3={museumV3} />;
  }
  if (scene.presentationLayout === "museum_chart") {
    return <MuseumChartScene scene={scene} museumV3={museumV3} />;
  }
  if (scene.presentationLayout === "museum_iconic") {
    return <MuseumIconicScene scene={scene} museumV3={museumV3} />;
  }
  if (scene.presentationLayout === "museum_closing") {
    return <MuseumIconicScene scene={scene} museumV3={museumV3} />;
  }

  const image = primaryImage(scene);
  const body = focusedBody(scene);
  const prompt = watchPrompt(scene);
  const timeline = scene.assets.timelineEvents[0];
  const treatmentClass = imageTreatmentClass(scene.imageTreatment);
  const layout = layoutClass(scene.presentationLayout);

  return (
    <article
      className={`rv-exp-companion rv-exp-companion--${scene.visualIntensity} rv-exp-companion--${scene.momentType} ${layout}`}
    >
      {showMomentLabel(scene) ? (
        <p className="rv-exp-companion__moment">{scene.momentLabel}</p>
      ) : null}

      {prompt ? <p className="rv-exp-companion__prompt">{prompt}</p> : null}

      {image ? (
        <div className="rv-exp-companion__media">
          <ExperienceImage
            src={image}
            alt={scene.headline}
            className={`rv-exp-companion__image ${treatmentClass}`.trim()}
            priority
          />
        </div>
      ) : null}

      <div className="rv-exp-companion__copy">
        {timeline?.year && scene.presentationLayout === "timeline" ? (
          <p className="rv-exp-companion__year">{timeline.year}</p>
        ) : null}
        {scene.headline && scene.presentationLayout !== "fullscreen" ? (
          <h2 className="rv-exp-companion__headline">{scene.headline}</h2>
        ) : null}
        {scene.presentationLayout === "fullscreen" && scene.headline ? (
          <h2 className="rv-exp-companion__headline rv-exp-companion__headline--overlay">{scene.headline}</h2>
        ) : null}
        {body ? <p className="rv-exp-companion__body">{body}</p> : null}
        {timeline?.label &&
        timeline.label !== scene.headline &&
        scene.presentationLayout === "timeline" ? (
          <p className="rv-exp-companion__timeline">{timeline.label}</p>
        ) : null}
        {scene.momentType === "performance_spotlight" &&
        performanceTitle &&
        performanceTitle !== "Unknown" ? (
          <p className="rv-exp-companion__performance">{performanceTitle}</p>
        ) : null}
        {scene.presentationLayout !== "fullscreen" ? (
          <p className="rv-exp-companion__artist">{metadata.artist}</p>
        ) : null}
      </div>
    </article>
  );
}
