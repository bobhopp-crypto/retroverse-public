"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { slugFromArtistName } from "@/lib/artist/slug";
import { trackPageHref } from "@/lib/search/entity-routes";
import type {
  PerformanceDeckCard,
  PerformanceDeckModel,
  PerformanceDeckStoryCard,
} from "@/lib/ops/intelligence/load-performance-deck";

import "./performance-deck.css";

type Props = {
  model: PerformanceDeckModel;
};

type DeckChip = {
  label: string;
  href?: string;
  external?: boolean;
  hint?: string;
};

function formatYear(year: number | null): string {
  return year == null ? "Retroverse archive" : String(year);
}

function shortText(text: string | null | undefined, maxLength = 150): string | null {
  const cleaned = text?.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (cleaned.length <= maxLength) return cleaned;
  const slice = cleaned.slice(0, maxLength).replace(/\s+\S*$/, "");
  return `${slice}...`;
}

function categoryLabel(category: PerformanceDeckStoryCard["category"]): string {
  const labels: Record<PerformanceDeckStoryCard["category"], string> = {
    recording: "Recording",
    video: "Video",
    performance: "Performance",
    chart: "Chart",
    quote: "Quote",
    artist: "Artist",
    album: "Album",
    cultural_impact: "Culture",
    tv_film: "TV / Film",
    trivia: "Detail",
  };
  return labels[category] ?? "Story";
}

function trackHref(rvtr: string): string {
  return trackPageHref(rvtr);
}

function songSheetHref(rvtr: string): string {
  return liveSongExperienceHref(rvtr);
}

function artistHref(artist: string): string {
  return `/artist/${slugFromArtistName(artist)}`;
}

function sourceChip(card: PerformanceDeckStoryCard, model: PerformanceDeckModel): DeckChip {
  if (card.sourceUrl?.startsWith("http")) {
    return {
      label: card.sourceLabel,
      href: card.sourceUrl,
      external: true,
      hint: card.sourceLabel.toLowerCase().includes("wikipedia") ? "Open source" : "Open source",
    };
  }

  if (card.category === "chart") {
    return { label: "Retroverse", href: trackHref(model.rvtr), hint: "Tap for chart" };
  }
  if (card.category === "album") {
    return { label: "Retroverse", href: songSheetHref(model.rvtr), hint: "Open package" };
  }
  if (card.category === "artist") {
    return { label: "Retroverse", href: artistHref(model.artist), hint: "Open artist" };
  }
  return { label: card.sourceLabel, href: trackHref(model.rvtr), hint: "Open song" };
}

function Chip({ chip }: { chip: DeckChip }) {
  if (!chip.href) {
    return <li className="performance-card__chip">{chip.label}</li>;
  }

  const content = (
    <>
      {chip.label}
      {chip.hint ? <span>{chip.hint}</span> : null}
    </>
  );

  return (
    <li className="performance-card__chip performance-card__chip--link">
      {chip.external ? (
        <a href={chip.href} target="_blank" rel="noreferrer">
          {content}
        </a>
      ) : (
        <Link href={chip.href}>{content}</Link>
      )}
    </li>
  );
}

function CardShell({
  tone,
  eyebrow,
  title,
  body,
  chips = [],
  children,
}: {
  tone: "hero" | "host" | "story" | "chart" | "artist" | "connection" | "your-story";
  eyebrow: string;
  title: string;
  body?: string | null;
  chips?: DeckChip[];
  children?: ReactNode;
}) {
  return (
    <article className={`performance-card performance-card--${tone}`}>
      <div className="performance-card__content">
        <p className="performance-card__eyebrow">{eyebrow}</p>
        <h2 className="performance-card__headline">{title}</h2>
        {body ? <p className="performance-card__body">{body}</p> : null}
        {chips.length > 0 ? (
          <ul className="performance-card__chips" aria-label="Card details">
            {chips.slice(0, 3).map((chip) => (
              <Chip key={`${chip.label}-${chip.href ?? "tag"}`} chip={chip} />
            ))}
          </ul>
        ) : null}
        {children}
      </div>
      <p className="performance-card__footer">retroverse.live</p>
    </article>
  );
}

function HeroCard({ card }: { card: Extract<PerformanceDeckCard, { type: "hero" }> }) {
  const metadataItems: Array<DeckChip | null> = [
    { label: formatYear(card.year) },
    card.peakHot100 != null
      ? { label: `Hot 100 peak #${card.peakHot100}`, href: trackHref(card.rvtr), hint: "Tap for chart" }
      : null,
    card.hasVdjMedia ? { label: "VDJ ready" } : null,
  ];
  const metadata = metadataItems.filter((item): item is DeckChip => Boolean(item));

  return (
    <article className="performance-card performance-card--hero">
      <div className="performance-card__hero-grid">
        <Link
          href={songSheetHref(card.rvtr)}
          className="performance-card__cover-wrap performance-card__cover-wrap--link"
          aria-label={`Open package for ${card.title}`}
        >
          <ArtistCover
            src={card.coverUrl}
            alt=""
            className="performance-card__cover"
            fallbackClassName="performance-card__cover-fallback"
            fallbackVariant="plate"
            placeholderContext={{
              artist: card.artist,
              album: card.albumTitle ?? card.title,
              releaseYear: card.year,
            }}
            plateDensity="compact"
          />
          <span>Open package</span>
        </Link>
        <div className="performance-card__content performance-card__content--hero">
          <p className="performance-card__eyebrow">Hero</p>
          <h1 className="performance-card__title">{card.title}</h1>
          <p className="performance-card__artist">
            <Link href={artistHref(card.artist)}>{card.artist}</Link>
          </p>
          <p className="performance-card__body">
            {card.albumTitle ? `A quick story deck from ${card.albumTitle}.` : "A quick story deck for the room."}
          </p>
          <ul className="performance-card__chips" aria-label="Song details">
            {metadata.map((item) => (
              <Chip key={item.label} chip={item} />
            ))}
          </ul>
        </div>
      </div>
      <p className="performance-card__footer">retroverse.live · {card.rvtr}</p>
    </article>
  );
}

function StoryCard({ card, model }: { card: PerformanceDeckStoryCard; model: PerformanceDeckModel }) {
  const headline = shortText(card.headline, 72) ?? "Song Moment";
  const body = shortText(card.fact, 150);
  const chips: DeckChip[] = [
    card.category === "chart"
      ? { label: categoryLabel(card.category), href: trackHref(model.rvtr), hint: "Tap for chart" }
      : { label: categoryLabel(card.category) },
    sourceChip(card, model),
  ];

  return (
    <CardShell
      tone={card.promoted ? "host" : "story"}
      eyebrow={card.promoted ? "Bob's Take / Host Note" : "Moment / Story"}
      title={headline}
      body={body}
      chips={chips}
    />
  );
}

function ChartCard({
  card,
  model,
}: {
  card: Extract<PerformanceDeckCard, { type: "chart" }>;
  model: PerformanceDeckModel;
}) {
  const title = card.peakHot100 != null ? `It climbed to #${card.peakHot100}` : "It left a chart footprint";
  const body =
    card.chartWeeks != null
      ? `This song stayed visible for ${card.chartWeeks} chart weeks.`
      : shortText(card.entries[0]?.detail, 130);
  const chips: DeckChip[] = card.entries
    .map((entry) => [
      entry.chart,
      entry.peak != null ? `#${entry.peak}` : null,
      entry.weeks != null ? `${entry.weeks}w` : null,
    ].filter(Boolean).join(" · "))
    .map((label) => ({ label, href: trackHref(model.rvtr), hint: "Tap for chart" }))
    .filter(Boolean);

  return (
    <CardShell tone="chart" eyebrow="Chart Signal" title={title} body={body} chips={chips}>
      <Link className="performance-card__primary-link" href={trackHref(model.rvtr)}>
        Tap for chart
      </Link>
    </CardShell>
  );
}

function ArtistCard({ card }: { card: Extract<PerformanceDeckCard, { type: "artist" }> }) {
  const leadFact = card.facts[0];
  const chips: DeckChip[] = [...new Set(card.facts.slice(0, 3).map((fact) => fact.sourceLabel))]
    .map((label) => ({ label, href: artistHref(card.artist), hint: "Open artist" }));

  return (
    <CardShell
      tone="artist"
      eyebrow="Artist Spotlight"
      title={card.artist}
      body={shortText(leadFact?.text, 150) ?? "A little artist context for the room."}
      chips={chips}
    />
  );
}

function RelatedArtistsCard({
  card,
}: {
  card: Extract<PerformanceDeckCard, { type: "related-artists" }>;
}) {
  return (
    <CardShell
      tone="connection"
      eyebrow="Connection / Related Songs"
      title="Follow the next thread"
      body="This song sits near a wider constellation of artists."
    >
      <div className="performance-card__mini-list">
        {card.artists.slice(0, 4).map((artist) => (
          <Link key={artist} href={artistHref(artist)}>
            {artist}
            <span>Open artist</span>
          </Link>
        ))}
      </div>
    </CardShell>
  );
}

function RelatedSongsCard({
  card,
}: {
  card: Extract<PerformanceDeckCard, { type: "related-songs" }>;
}) {
  return (
    <CardShell
      tone="connection"
      eyebrow="Connection / Related Songs"
      title="Keep the thread moving"
      body="A few nearby songs from the Retroverse graph."
    >
      <div className="performance-card__song-links">
        {card.songs.slice(0, 3).map((song) => (
          <Link key={song.rvtr} href={`/rvtr/${song.rvtr}/deck`}>
            {song.title}
            {song.artist ? <span>{song.artist}</span> : null}
          </Link>
        ))}
      </div>
    </CardShell>
  );
}

function BobsNoteCard() {
  return (
    <CardShell
      tone="your-story"
      eyebrow="Your Story"
      title="What does this song mean to you?"
      body="Tell us where you first heard it, who it reminds you of, or why it still matters."
    >
      <button type="button" className="performance-card__share">
        Share Your Story
      </button>
    </CardShell>
  );
}

function DeckCard({ card, model }: { card: PerformanceDeckCard; model: PerformanceDeckModel }) {
  if (card.type === "hero") return <HeroCard card={card} />;
  if (card.type === "story") return <StoryCard card={card} model={model} />;
  if (card.type === "chart") return <ChartCard card={card} model={model} />;
  if (card.type === "artist") return <ArtistCard card={card} />;
  if (card.type === "related-artists") return <RelatedArtistsCard card={card} />;
  if (card.type === "related-songs") return <RelatedSongsCard card={card} />;
  return <BobsNoteCard />;
}

export function PerformanceDeckView({ model }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onScroll() {
      if (!viewport) return;
      const next = Math.round(viewport.scrollLeft / viewport.clientWidth);
      setActiveIndex(Math.min(Math.max(next, 0), model.cards.length - 1));
    }

    viewport.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [model.cards.length]);

  function scrollToCard(index: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    viewport.scrollTo({ left: viewport.clientWidth * index, behavior: "smooth" });
  }

  return (
    <main className="performance-deck">
      <header className="performance-deck__topbar">
        <Link href="/live" className="performance-deck__back-link">
          Live
        </Link>
        <p className="performance-deck__counter">
          {activeIndex + 1}/{model.cards.length}
        </p>
      </header>

      <div ref={viewportRef} className="performance-deck__viewport" aria-label={`${model.title} deck`}>
        {model.cards.map((card) => (
          <section key={card.id} className="performance-deck__slide">
            <DeckCard card={card} model={model} />
          </section>
        ))}
      </div>

      <footer className="performance-deck__controls" aria-label="Deck navigation">
        <button
          type="button"
          onClick={() => scrollToCard(Math.max(activeIndex - 1, 0))}
          disabled={activeIndex === 0}
        >
          Back
        </button>
        <div className="performance-deck__dots" aria-hidden>
          {model.cards.map((card, index) => (
            <span key={card.id} className={index === activeIndex ? "is-active" : ""} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => scrollToCard(Math.min(activeIndex + 1, model.cards.length - 1))}
          disabled={activeIndex === model.cards.length - 1}
        >
          Next
        </button>
      </footer>
    </main>
  );
}
