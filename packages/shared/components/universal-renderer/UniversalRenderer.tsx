"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { RendererCard } from "@/lib/universal-renderer/card-types";
import type { RvbrRendererTheme } from "@/lib/retroverse/rvbr/renderer-theme";
import { RVBR_RENDERER_DEFAULT_VARS } from "@/lib/retroverse/rvbr/renderer-theme-defaults";

import { AlbumCard } from "./cards/AlbumCard";
import { ChartsCard } from "./cards/ChartsCard";
import { CreditsCard } from "./cards/CreditsCard";
import { FactsCard } from "./cards/FactsCard";
import { HeroCard } from "./cards/HeroCard";
import { LibraryStatsCard } from "./cards/LibraryStatsCard";
import { QuoteCard } from "./cards/QuoteCard";
import { StoryCard } from "./cards/StoryCard";
import { TimelineCard } from "./cards/TimelineCard";

import "./universal-renderer.css";

type Props = {
  artist: string;
  title: string;
  cards: RendererCard[];
  /** RVBR era presentation — resolved server-side from song year. */
  theme?: RvbrRendererTheme;
  /** Back href — defaults to Retroverse home. */
  backHref?: string;
};

function renderCard(card: RendererCard): React.ReactNode {
  switch (card.kind) {
    case "hero":          return <HeroCard card={card} />;
    case "story":         return <StoryCard card={card} />;
    case "quote":         return <QuoteCard card={card} />;
    case "charts":        return <ChartsCard card={card} />;
    case "album":         return <AlbumCard card={card} />;
    case "timeline":      return <TimelineCard card={card} />;
    case "facts":         return <FactsCard card={card} />;
    case "library_stats": return <LibraryStatsCard card={card} />;
    case "credits":       return <CreditsCard card={card} />;
  }
}

export function UniversalRenderer({
  artist,
  title,
  cards,
  theme,
  backHref = "/",
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const cssVars = theme?.cssVars ?? RVBR_RENDERER_DEFAULT_VARS;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(() => {
        const index = Math.round(el.scrollLeft / el.clientWidth);
        setActiveIndex(Math.max(0, Math.min(cards.length - 1, index)));
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, [cards.length]);

  const goTo = useCallback(
    (index: number) => {
      const el = viewportRef.current;
      if (!el) return;
      el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
    },
    [],
  );

  return (
    <div
      className="urx"
      style={cssVars}
      data-rvbr-era={theme?.eraSlug ?? undefined}
      data-rvbr-world={theme?.visualWorldId ?? undefined}
    >
      {/* Top bar */}
      <header className="urx__topbar">
        <Link href={backHref} className="urx__back" aria-label="Back to Retroverse">
          Retroverse
        </Link>

        <div
          className="urx__dots"
          role="tablist"
          aria-label="Song experience sections"
        >
          {cards.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Card ${i + 1} of ${cards.length}`}
              className={`urx__dot${i === activeIndex ? " urx__dot--active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </header>

      {/* Swipeable card deck */}
      <div
        className="urx__viewport"
        ref={viewportRef}
        role="region"
        aria-label={`${title} by ${artist} — song experience`}
      >
        {cards.map((card, i) => (
          <div key={`${card.kind}-${i}`} className="urx__card-wrap">
            {renderCard(card)}
          </div>
        ))}
      </div>
    </div>
  );
}
