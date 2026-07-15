"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RetroverseBack } from "@/components/navigation/RetroverseBack";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
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
  /** Fixed fallback destination when no internal Retroverse history exists. */
  backHref?: string;
  /** Explicit label for a fixed fallback destination. */
  backLabel?: string;
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
  backHref = "/search",
  backLabel = "Search",
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Package and VDJ songs remain part of the public Explorer. Era packages
  // may still supply imagery and card content, but must not replace public
  // chrome or reintroduce the retired cream renderer theme.
  const cssVars = {
    ...(theme?.cssVars ?? RVBR_RENDERER_DEFAULT_VARS),
    "--urx-cream": "var(--ex-bg)",
    "--urx-paper": "var(--ex-panel)",
    "--urx-ink": "var(--ex-ink)",
    "--urx-teal": "var(--ex-aqua-accent)",
    "--urx-orange": "var(--ex-purple)",
    "--urx-red": "var(--ex-magenta)",
    "--urx-accent-soft": "var(--ex-aqua-dim)",
    "--urx-border": "1px solid var(--ex-line-accent)",
    "--urx-border-width": "1px",
    "--urx-bg-gradient": "linear-gradient(180deg, var(--ex-bg) 0%, var(--ex-bg-mid) 56%, var(--ex-bg) 100%)",
    "--urx-hero-placeholder": "linear-gradient(145deg, var(--ex-purple-deep), var(--ex-bg))",
    "--urx-hero-wash": "linear-gradient(160deg, rgba(168, 85, 255, 0.52), rgba(34, 231, 255, 0.28))",
    "--urx-hero-scrim": "linear-gradient(180deg, rgba(5, 8, 20, 0.2), rgba(5, 8, 20, 0.9))",
    "--urx-shadow-color": "rgba(168, 85, 255, 0.2)",
    "--urx-divider-color": "var(--ex-aqua-accent)",
    "--urx-paper-rgb": "12, 15, 35",
    "--urx-ink-rgb": "243, 247, 255",
  } as React.CSSProperties;

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
    <Rv2PublicShell className="rv2-song rv2-universal-song">
      <div
      className="urx"
      style={cssVars}
      data-rvbr-era={theme?.eraSlug ?? undefined}
      data-rvbr-world={theme?.visualWorldId ?? undefined}
    >
      {/* Package navigation only; shared Explorer chrome owns public navigation. */}
      <header className="urx__topbar">
        <RetroverseBack
          fallbackHref={backHref}
          fallbackLabel={backLabel}
          className="urx__back"
        />
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
    </Rv2PublicShell>
  );
}
