"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { classifyHomepageSwipe } from "@/lib/homepage-stage-gesture";

import { StageOnboarding } from "./stage-onboarding";
import "./homepage-stage-navigation.css";

type RelatedSong = { rvtr: string; title?: string; releaseYear?: number | null; peakHot100?: number | null; href?: string; coverUrl?: string | null };
type Props = {
  children: ReactNode;
  rvtr: string | null;
  relatedSongs: RelatedSong[];
  artistHref: string | null;
  source: "homepage" | "song";
  live?: boolean;
};

type GestureOrigin = { x: number; y: number; at: number; delegateArtistDown: boolean };
const PERMANENT_KEY = "rvStageOnboardingPermanent";
const SESSION_KEY = "rvStageOnboardingSession";
const ROUTE_STACK_KEY = "rvStageRouteStack";
const RVTR = /^RVTR\d{6}$/i;

function rvtrFromRoute(route: string): string | null {
  try {
    const url = new URL(route, "https://retroverse.live");
    const queryRvtr = url.searchParams.get("stageRvtr");
    const pathRvtr = url.pathname.match(/\/retroverse-2\/song\/(RVTR\d{6})/i)?.[1];
    const candidate = (queryRvtr || pathRvtr || "").toUpperCase();
    return RVTR.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function HomepageStageNavigation({ children, rvtr, relatedSongs, artistHref, source, live = false }: Props) {
  const router = useRouter();
  const origin = useRef<GestureOrigin | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(PERMANENT_KEY) === "1" || sessionStorage.getItem(SESSION_KEY) === "1") return;
    setShowOnboarding(true);
  }, []);

  const dismiss = useCallback((dontShowAgain: boolean) => {
    sessionStorage.setItem(SESSION_KEY, "1");
    if (dontShowAgain) localStorage.setItem(PERMANENT_KEY, "1");
    setShowOnboarding(false);
  }, []);

  const navigate = useCallback((direction: "left" | "right" | "up" | "down") => {
    if (direction === "up") {
      router.push("/jukebox");
      return;
    }
    if (direction === "down") {
      if (artistHref) router.push(artistHref);
      return;
    }
    if (direction === "left") {
      let previous: string[] = [];
      try { previous = JSON.parse(sessionStorage.getItem(ROUTE_STACK_KEY) || "[]") as string[]; } catch { /* use homepage fallback */ }
      const route = previous.pop() || "/";
      sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify(previous));
      router.push(route);
      return;
    }

    if (direction === "right") {
      const currentRoute = `${window.location.pathname}${window.location.search}`;
      let stack: string[] = [];
      try { stack = JSON.parse(sessionStorage.getItem(ROUTE_STACK_KEY) || "[]") as string[]; } catch { /* start a new route history */ }
      const visited = new Set(stack.map(rvtrFromRoute).filter((value): value is string => Boolean(value)));
      if (rvtr) visited.add(rvtr.toUpperCase());
      const recommendation = relatedSongs.find((song) => RVTR.test(song.rvtr) && !visited.has(song.rvtr.toUpperCase()));
      if (!recommendation) return;
      sessionStorage.setItem(ROUTE_STACK_KEY, JSON.stringify([...stack, currentRoute]));
      router.push(source === "homepage" && !live
        ? `/?stageRvtr=${encodeURIComponent(recommendation.rvtr.toUpperCase())}`
        : recommendation.href || `/retroverse-2/song/${encodeURIComponent(recommendation.rvtr.toUpperCase())}`);
      return;
    }
  }, [artistHref, live, relatedSongs, router, rvtr, source]);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (showOnboarding || (event.target as HTMLElement).closest("button, a, input, textarea, select, [role=dialog]")) return;
    const target = event.target as HTMLElement;
    const onSwipeSurface = target.closest(".rv2-song__header, .live-song__hero");
    if (!onSwipeSurface) return;
    origin.current = {
      x: event.clientX,
      y: event.clientY,
      at: performance.now(),
      delegateArtistDown: Boolean(target.closest(".rv2-song__header")),
    };
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* capture is best effort */ }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = origin.current;
    origin.current = null;
    if (!start) return;
    const direction = classifyHomepageSwipe(event.clientX - start.x, event.clientY - start.y, performance.now() - start.at);
    if (direction === "down" && start.delegateArtistDown) return;
    if (direction) navigate(direction);
  }

  return (
    <div className="rv-stage-navigation" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { origin.current = null; }}>
      {children}
      {showOnboarding ? <StageOnboarding onDismiss={dismiss} /> : null}
    </div>
  );
}
