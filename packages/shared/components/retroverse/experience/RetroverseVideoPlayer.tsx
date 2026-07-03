"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

import { usePlaybackSync } from "@/components/retroverse/experience/PlaybackSyncProvider";
import { useAttractTour } from "@/components/retroverse/experience/AttractTourProvider";
import type { PlaybackManifest } from "@/lib/playback/types";

import "./retroverse-video-player.css";

type PlayerPhase = "idle" | "playing" | "ended";

type Props = {
  posterUrl: string | null;
  title: string;
  playback: PlaybackManifest;
  className?: string;
  /** Report position to the living experience timeline. */
  syncPlayback?: boolean;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        config: {
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onStateChange?: (event: { data: number }) => void;
            onReady?: (event: { target: { playVideo: () => void } }) => void;
          };
        },
      ) => { destroy: () => void; playVideo: () => void };
      PlayerState: { ENDED: number; PLAYING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });

  return youtubeApiPromise;
}

export function RetroverseVideoPlayer({
  posterUrl,
  title,
  playback,
  className,
  syncPlayback = false,
}: Props) {
  const [phase, setPhase] = useState<PlayerPhase>("idle");
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeMountRef = useRef<HTMLDivElement>(null);
  const youtubePlayerRef = useRef<{ destroy: () => void; playVideo: () => void } | null>(null);
  const labelId = useId();
  const { reportLocalPlayback } = usePlaybackSync();
  const tour = useAttractTour();

  const usesStream = Boolean(playback.streamUrl);
  const usesEmbed = Boolean(playback.embedUrl && playback.provider === "youtube");

  const resetToIdle = useCallback(() => {
    if (youtubePlayerRef.current) {
      youtubePlayerRef.current.destroy();
      youtubePlayerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setPhase("idle");
  }, []);

  const handleEnded = useCallback(() => {
    setPhase("ended");
  }, []);

  const startPlayback = useCallback(async () => {
    tour.registerInteraction();
    if (!playback.canPlay) return;

    if (usesStream && videoRef.current) {
      setPhase("playing");
      try {
        await videoRef.current.play();
      } catch {
        setPhase("idle");
      }
      return;
    }

    if (usesEmbed && playback.youtubeId && youtubeMountRef.current) {
      setPhase("playing");
      await loadYouTubeApi();
      if (!window.YT?.Player) {
        setPhase("idle");
        return;
      }

      youtubePlayerRef.current?.destroy();
      youtubePlayerRef.current = new window.YT.Player(youtubeMountRef.current, {
        videoId: playback.youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.playVideo();
          },
          onStateChange: (event) => {
            if (event.data === window.YT!.PlayerState.ENDED) {
              handleEnded();
            }
          },
        },
      });
    }
  }, [playback, usesStream, usesEmbed, handleEnded, tour]);

  useEffect(() => {
    return () => {
      youtubePlayerRef.current?.destroy();
    };
  }, []);

  const reportVideoTime = useCallback(() => {
    if (!syncPlayback) return;
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    reportLocalPlayback({
      currentTimeSec: video.currentTime,
      durationSec: video.duration,
      playing: !video.paused && !video.ended,
    });
  }, [syncPlayback, reportLocalPlayback]);

  useEffect(() => {
    if (!syncPlayback) return;
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => reportVideoTime();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play", onTime);
    video.addEventListener("pause", onTime);
    video.addEventListener("seeked", onTime);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play", onTime);
      video.removeEventListener("pause", onTime);
      video.removeEventListener("seeked", onTime);
    };
  }, [syncPlayback, reportVideoTime, phase]);

  const showOverlay = phase === "idle" || phase === "ended";
  const overlayLabel =
    phase === "ended" ? "Replay" : playback.canPlay ? playback.playLabel : null;

  const panelClass = ["rv-video-player", className].filter(Boolean).join(" ");

  return (
    <div
      className={panelClass}
      data-phase={phase}
      data-can-play={playback.canPlay ? "true" : "false"}
    >
      <div className="rv-video-player__stage">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="rv-video-player__poster"
            width={520}
            height={520}
            decoding="async"
            aria-hidden={phase === "playing"}
          />
        ) : (
          <div className="rv-video-player__poster rv-video-player__poster--empty" aria-hidden />
        )}

        {usesStream ? (
          <video
            ref={videoRef}
            className="rv-video-player__video"
            src={playback.streamUrl ?? undefined}
            poster={posterUrl ?? undefined}
            playsInline
            controls={phase === "playing"}
            preload="metadata"
            aria-label={`Video for ${title}`}
            onEnded={handleEnded}
            onPause={() => {
              const video = videoRef.current;
              if (video && video.currentTime >= video.duration - 0.25) return;
            }}
          />
        ) : null}

        {usesEmbed ? (
          <div
            ref={youtubeMountRef}
            className="rv-video-player__embed"
            aria-label={`Video for ${title}`}
          />
        ) : null}

        {showOverlay && overlayLabel ? (
          <button
            type="button"
            className="rv-video-player__play"
            aria-labelledby={labelId}
            onClick={() => {
              if (phase === "ended") resetToIdle();
              void startPlayback();
            }}
          >
            <span className="rv-video-player__play-icon" aria-hidden>
              {phase === "ended" ? "↻" : "▶"}
            </span>
            <span id={labelId} className="rv-video-player__play-label">
              {overlayLabel}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
