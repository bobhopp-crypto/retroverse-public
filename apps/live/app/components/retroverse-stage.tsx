"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { useRouter } from "next/navigation";

import { artistInDepthHref } from "@/lib/artist/artist-in-depth-gesture";
import { classifyHomepageSwipe } from "@/lib/homepage-stage-gesture";
import { stageNowFromPublicPayload, type PublicCurrentPayload, type StageNow, type StageRelatedTrack } from "@/lib/stage-now";
import {
  IDLE_ROTATION_MS,
  uniquePlaylistVideos,
  videoForIdentity,
  videosForRecommendations,
  visualAssetUrl,
  type VdjbxVideo,
} from "@/lib/vdjbx-catalog";
import { StageOnboarding } from "./vdjbx-stage-onboarding";
import { LivingPoster } from "./living-poster";

import "./retroverse-stage.css";

type SurfaceMode = "hero" | "recommendations";

const ONBOARDING_PERMANENT_KEY = "rvStageOnboardingPermanent";
const ONBOARDING_SESSION_KEY = "rvStageOnboardingSession";
const LIVE_POLL_MS = 5_000;
function sameVideo(a: VdjbxVideo | null, b: VdjbxVideo | null) {
  return Boolean(a && b && a.videoKey === b.videoKey && a.title === b.title && a.artist === b.artist);
}

function videoFromLive(now: StageNow | null): VdjbxVideo | null {
  if (!now) return null;
  const match = videoForIdentity(now.artist, now.title);
  return {
    ...(match || {}),
    videoKey: match?.videoKey || now.videoKey,
    title: now.title,
    artist: now.artist,
    year: now.year,
    songRvtr: now.songRvtr || match?.songRvtr || null,
    heroRvtr: now.heroRvtr || match?.heroRvtr || null,
    collections: match?.collections || [],
  };
}

function relatedVideo(track: StageRelatedTrack): VdjbxVideo | null {
  const title = track.title?.trim() || "";
  const artist = track.artistName?.trim() || track.artist?.trim() || "";
  if (!title || !artist) return null;
  const match = videoForIdentity(artist, title);
  const rvtr = track.rvtr?.toUpperCase() || match?.songRvtr || null;
  const key = match?.videoKey || rvtr;
  if (!key) return null;
  return {
    ...(match || {}),
    videoKey: key,
    title,
    artist,
    year: track.releaseYear ?? track.year ?? match?.year ?? null,
    songRvtr: rvtr,
    heroRvtr: match?.heroRvtr || rvtr,
  };
}

export function RetroverseStage({ initial }: { initial?: StageNow | null }) {
  const router = useRouter();
  const idlePool = useMemo(() => uniquePlaylistVideos(), []);
  const [apiNow, setApiNow] = useState<StageNow | null>(initial ?? null);
  const [surface, setSurface] = useState<SurfaceMode>("hero");
  const [idleIndex, setIdleIndex] = useState(() => idlePool.length ? Math.floor(Date.now() / IDLE_ROTATION_MS) % idlePool.length : 0);
  const [visitStack, setVisitStack] = useState<VdjbxVideo[]>([]);
  const [visitIndex, setVisitIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);

  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startAt = useRef(0);
  const moved = useRef(false);

  const liveFeatured = useMemo(() => videoFromLive(apiNow), [apiNow]);
  const idleFeatured = idlePool[idleIndex] || null;
  const featuredVideo = liveFeatured || idleFeatured;

  useEffect(() => {
    if (!featuredVideo) return;
    setVisitStack((stack) => {
      if (!stack.length) return [featuredVideo];
      if (sameVideo(stack[0], featuredVideo)) return stack;
      if (visitIndex === 0) return [featuredVideo];
      return stack;
    });
  }, [featuredVideo, visitIndex]);

  const currentVideo = visitStack[visitIndex] || featuredVideo;
  const isLiveCurrent = Boolean(liveFeatured && currentVideo && liveFeatured.videoKey === currentVideo.videoKey);

  useEffect(() => {
    if (localStorage.getItem(ONBOARDING_PERMANENT_KEY) === "1" || sessionStorage.getItem(ONBOARDING_SESSION_KEY) === "1") return;
    setShowOnboarding(true);
  }, []);

  const dismissOnboarding = useCallback((dontShowAgain: boolean) => {
    sessionStorage.setItem(ONBOARDING_SESSION_KEY, "1");
    if (dontShowAgain) localStorage.setItem(ONBOARDING_PERMANENT_KEY, "1");
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const response = await fetch(`/api/sunday-nights/current?ts=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        if (!response.ok || !active) return;
        const payload = await response.json() as PublicCurrentPayload;
        setApiNow(stageNowFromPublicPayload(payload));
      } catch {
        // Keep the last confirmed Redis snapshot until the next poll succeeds.
      }
    };
    void poll();
    const timer = window.setInterval(poll, LIVE_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (liveFeatured || idlePool.length < 2) return undefined;
    const timer = window.setInterval(() => setIdleIndex((index) => (index + 1) % idlePool.length), IDLE_ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [idlePool.length, liveFeatured]);

  const recommendations = useMemo(() => {
    if (!currentVideo) return [];
    const liveRelated = isLiveCurrent ? (apiNow?.relatedTracks || []).map(relatedVideo).filter((video): video is VdjbxVideo => Boolean(video)) : [];
    const candidates = liveRelated.length ? liveRelated : videosForRecommendations(currentVideo);
    const visited = new Set(visitStack.slice(0, visitIndex + 1).map((video) => video.videoKey));
    return candidates.filter((video) => !visited.has(video.videoKey)).slice(0, 12);
  }, [apiNow?.relatedTracks, currentVideo, isLiveCurrent, visitIndex, visitStack]);

  const goHero = useCallback(() => {
    setMessage("");
    setSurface("hero");
  }, []);

  const goRecommendations = useCallback(() => {
    setMessage("");
    setSurface("recommendations");
  }, []);

  const selectRecommendation = useCallback((video: VdjbxVideo) => {
    setVisitStack((stack) => [...stack.slice(0, visitIndex + 1), video]);
    setVisitIndex((index) => index + 1);
    setSurface("hero");
  }, [visitIndex]);

  const goBack = useCallback(() => {
    setMessage("");
    if (surface !== "hero") {
      setSurface("hero");
      return;
    }
    if (visitIndex > 0) {
      setVisitIndex((index) => index - 1);
      return;
    }
    if (typeof window !== "undefined" && Number(window.history.state?.idx) > 0) {
      router.back();
      return;
    }
    setMessage("There isn’t a previous song in this visit yet.");
  }, [router, surface, visitIndex]);

  const goJukebox = useCallback(() => router.push("/jukebox"), [router]);

  const goArtist = useCallback(() => {
    if (!currentVideo?.artist?.trim()) return;
    const href = artistInDepthHref({
      artistHref: null,
      rvtr: currentVideo.songRvtr || null,
      artistName: currentVideo.artist,
    });
    if (href) router.push(href);
  }, [currentVideo, router]);

  const openSongGuide = useCallback(() => {
    if (!currentVideo) return;
    const currentSong = { title: currentVideo.title, artist: currentVideo.artist, year: currentVideo.year ?? null };
    window.dispatchEvent(new CustomEvent("retroverse:song-context", { detail: currentSong }));
    window.dispatchEvent(new CustomEvent("retroverse:open-arvey", { detail: { currentSong } }));
  }, [currentVideo]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (showOnboarding || surface !== "hero") return;
    if ((event.target as HTMLElement).closest("button, a, input, textarea, select, [role=dialog], .rv-hero-actions, .rv-nav-desktop")) return;
    moved.current = false;
    startX.current = event.clientX;
    startY.current = event.clientY;
    startAt.current = performance.now();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is best effort */ }
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (startX.current == null || startY.current == null) return;
    if (Math.abs(event.clientX - startX.current) > 12 || Math.abs(event.clientY - startY.current) > 12) moved.current = true;
  };

  const clearPointer = () => { startX.current = null; startY.current = null; };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (startX.current == null || startY.current == null) return;
    const dx = event.clientX - startX.current;
    const dy = event.clientY - startY.current;
    const elapsed = performance.now() - startAt.current;
    const wasMove = moved.current;
    clearPointer();
    if (surface !== "hero") return;
    const direction = classifyHomepageSwipe(dx, dy, elapsed);
    if (direction === "left") { goBack(); return; }
    if (direction === "right") { goRecommendations(); return; }
    if (direction === "up") { goJukebox(); return; }
    if (direction === "down") { goArtist(); return; }
    if (!wasMove && currentVideo) openSongGuide();
  };

  return (
    <div className={`retroverse-stage is-${surface}`}>
      {surface === "hero" ? (
        <section
          className="rv-hero"
          aria-label="Featured video"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={clearPointer}
        >
          <LivingPoster videoKey={currentVideo?.videoKey || null} heroRvtr={currentVideo?.heroRvtr || currentVideo?.songRvtr || null} title={currentVideo?.title || null} artist={currentVideo?.artist || null} />
          {showOnboarding ? <StageOnboarding onDismiss={dismissOnboarding} /> : null}
          <div className="rv-overlay">
            <p className="rv-now-label">{isLiveCurrent ? "LIVE" : "NOW PLAYING"}</p>
            <h1>{currentVideo?.title || "Now playing"}</h1>
            <p className="rv-artist">{currentVideo?.artist || ""}</p>
            {currentVideo?.year != null ? <p className="rv-year">{currentVideo.year}</p> : null}
            <div className="rv-hero-actions">
              <button type="button" className="rv-story-open" onClick={openSongGuide}><span>CHAT ABOUT THIS</span><span aria-hidden="true">↓</span></button>
              <button type="button" className="rv-jukebox-open" onClick={goJukebox}><span>JUKEBOX</span><span aria-hidden="true">↑</span></button>
            </div>
            {message ? <p className="rv-hint" role="status">{message}</p> : null}
          </div>
        </section>
      ) : (
        <section className="rv-recommendations" aria-label="Song recommendations">
          <header className="rv-recommendations__header">
            <button type="button" onClick={goHero}>← BACK TO THIS SONG</button>
            <p>RECOMMENDATIONS</p>
            <h1>{currentVideo?.title || "Now playing"}</h1>
            <span>{currentVideo?.artist || ""}</span>
          </header>
          {recommendations.length ? (
            <div className="rv-recommendations__list">
              {recommendations.map((video) => (
                <button className="rv-recommendation" key={video.videoKey} type="button" onClick={() => selectRecommendation(video)}>
                  <span className="rv-recommendation__art">
                    {visualAssetUrl(video.heroRvtr || video.songRvtr) ? <img src={visualAssetUrl(video.heroRvtr || video.songRvtr)!} alt="" /> : <span aria-hidden="true">♫</span>}
                  </span>
                  <span className="rv-recommendation__copy"><strong>{video.title}</strong><small>{video.artist}{video.year ? ` · ${video.year}` : ""}</small></span>
                  <span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="rv-recommendations__empty">No recommendations are available for this song yet.</p>
          )}
        </section>
      )}

      <nav className="rv-nav-desktop" aria-label="Music navigation">
        <button type="button" className={surface === "hero" ? "is-active" : ""} onClick={goHero}>HOME</button>
        <button type="button" onClick={goJukebox}>VIDEO JUKEBOX</button>
        <button type="button" onClick={openSongGuide}>ASK ANYTHING</button>
        <button type="button" onClick={() => router.push("/jukebox?search=1")}>SEARCH</button>
      </nav>
    </div>
  );
}
