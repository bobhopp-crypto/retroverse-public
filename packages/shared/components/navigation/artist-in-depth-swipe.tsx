"use client";

import { useRouter } from "next/navigation";
import { useRef, type PointerEvent, type ReactNode, type TouchEvent } from "react";

import { artistSwipeScrollTop, isDownwardArtistSwipe } from "@/lib/artist/artist-in-depth-gesture";

import "./artist-in-depth-swipe.css";

type Origin = { x: number; y: number; t: number; scrollTop: number };

type Props = {
  href: string | null;
  children: ReactNode;
  className?: string;
  /** Song pages scroll. Only a pull-down at the top opens the artist. */
  requireScrollTop?: boolean;
  /** Broadcast / player surfaces should fill their stage. */
  fill?: boolean;
};

export function ArtistInDepthSwipe({
  href,
  children,
  className,
  requireScrollTop = false,
  fill = false,
}: Props) {
  const router = useRouter();
  const origin = useRef<Origin | null>(null);
  const navigated = useRef(false);

  function arm(x: number, y: number) {
    if (!href) return;
    origin.current = { x, y, t: performance.now(), scrollTop: window.scrollY };
  }

  function release(x: number, y: number) {
    const start = origin.current;
    origin.current = null;
    if (!start || !href || navigated.current) return;
    const matched = isDownwardArtistSwipe({
      dx: x - start.x,
      dy: y - start.y,
      elapsedMs: performance.now() - start.t,
      scrollTop: artistSwipeScrollTop({
        requireScrollTop,
        scrollTopAtStart: start.scrollTop,
      }),
      requireScrollTop,
    });
    if (!matched) return;
    navigated.current = true;
    router.push(href);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    arm(event.clientX, event.clientY);
    const up = (next: globalThis.PointerEvent) => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      release(next.clientX, next.clientY);
    };
    const cancel = () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      origin.current = null;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    arm(touch.clientX, touch.clientY);
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    if (!touch) return;
    release(touch.clientX, touch.clientY);
  }

  const classes = [
    fill ? "artist-depth-swipe--fill" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes || undefined}
      onPointerDown={onPointerDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        origin.current = null;
      }}
    >
      {children}
    </div>
  );
}
