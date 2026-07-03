"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { typographyClass } from "@/lib/retroverse/renderer/art-direction-theme";
import type { PublicExperiencePayload } from "@/lib/retroverse/renderer/load-public-experience";
import type { PresentableScene } from "@/lib/retroverse/renderer/scene-presentation";

import { DebugOverlay } from "./DebugOverlay";
import { ExperienceControls } from "./ExperienceControls";
import { MuseumExperienceControls } from "./MuseumExperienceControls";
import { PerformanceCompanionScene } from "./PerformanceCompanionScene";

type Props = {
  payload: PublicExperiencePayload;
  publicationBadge?: "extended" | "showcase" | null;
};

function sceneKey(scene: PresentableScene): string {
  return `scene-${scene.sceneNumber}-${scene.museumRoom ?? scene.presentationLayout}`;
}

export function ExperiencePlayer({ payload, publicationBadge = null }: Props) {
  const { experience, scenes, artDirection, themeVars, pipeline } = payload;
  const { spec, totalDurationSec } = experience;

  const [sceneIndex, setSceneIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(spec.renderingInstructions.autoAdvance ?? false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const scene = scenes[sceneIndex] as PresentableScene | undefined;
  const performanceTitle = spec.metadata.primaryPerformance?.title ?? "Performance";
  const museumMode = pipeline.usedMuseum;

  const elapsedBeforeCurrent = useMemo(
    () => scenes.slice(0, sceneIndex).reduce((sum, s) => sum + s.durationSec, 0),
    [scenes, sceneIndex],
  );

  const remainingSec = Math.max(0, totalDurationSec - elapsedBeforeCurrent - (scene?.durationSec ?? 0));

  const goPrev = useCallback(() => {
    setTransitioning(true);
    setSceneIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setTransitioning(true);
    setSceneIndex((i) => Math.min(scenes.length - 1, i + 1));
  }, [scenes.length]);

  useEffect(() => {
    if (!transitioning) return;
    const timer = window.setTimeout(() => setTransitioning(false), 480);
    return () => window.clearTimeout(timer);
  }, [transitioning, sceneIndex]);

  useEffect(() => {
    if (!autoplay || !scene || museumMode) return;
    const ms = Math.max(3000, scene.durationSec * 1000);
    const timer = window.setTimeout(() => {
      setSceneIndex((i) => (i < scenes.length - 1 ? i + 1 : i));
    }, ms);
    return () => window.clearTimeout(timer);
  }, [autoplay, scene, sceneIndex, scenes.length, museumMode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "d" || e.key === "D") {
        setDebugVisible((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start == null || end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 48) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  if (!scene) return null;

  const typoClass = typographyClass(artDirection);

  return (
    <div
      className={`rv-exp-player rv-exp-player--v02 ${museumMode ? "rv-exp-player--museum rv-exp-player--museum-v3" : ""} ${typoClass}`}
      style={themeVars as CSSProperties}
      onTouchStart={museumMode ? onTouchStart : undefined}
      onTouchEnd={museumMode ? onTouchEnd : undefined}
    >
      {museumMode ? null : (
        <header className="rv-exp-player__header">
          {publicationBadge ? (
            <span className={`rv-exp-player__pub-badge rv-exp-player__pub-badge--${publicationBadge}`}>
              {publicationBadge === "showcase" ? "Showcase" : "Extended Experience"}
            </span>
          ) : null}
          <p className="rv-exp-player__artist">{spec.metadata.artist}</p>
          <p className="rv-exp-player__title">{spec.metadata.title}</p>
        </header>
      )}

      <main
        className={`rv-exp-player__stage ${transitioning ? "rv-exp-player__stage--enter" : ""}`}
        key={sceneKey(scene)}
        data-exhibit={scene.museumRoom ?? undefined}
      >
        <PerformanceCompanionScene
          scene={scene}
          metadata={spec.metadata}
          performanceTitle={performanceTitle}
          museumV3={museumMode}
        />
      </main>

      {museumMode ? (
        <MuseumExperienceControls
          sceneIndex={sceneIndex}
          sceneCount={scenes.length}
          canPrev={sceneIndex > 0}
          canNext={sceneIndex < scenes.length - 1}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : (
        <ExperienceControls
          sceneIndex={sceneIndex}
          sceneCount={scenes.length}
          momentLabel={scene.momentLabel}
          remainingSec={remainingSec}
          autoplay={autoplay}
          canPrev={sceneIndex > 0}
          canNext={sceneIndex < scenes.length - 1}
          onPrev={goPrev}
          onNext={goNext}
          onToggleAutoplay={() => setAutoplay((v) => !v)}
        />
      )}

      <DebugOverlay
        scene={scene}
        sceneIndex={sceneIndex}
        sceneCount={scenes.length}
        patronValue={spec.metadata.patronValue}
        confidence={spec.estimatedRenderingConfidence}
        pipeline={pipeline}
        visible={debugVisible}
        onToggle={() => setDebugVisible((v) => !v)}
      />
    </div>
  );
}
