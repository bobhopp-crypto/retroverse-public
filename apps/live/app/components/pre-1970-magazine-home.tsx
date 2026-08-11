"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { HomeSearchInput } from "@/app/components/home-search-input";
import { chooseMagazineEditorial } from "./magazine-editorial";
import { extractMagazineAccent } from "./magazine-accent";
import "./pre-1970-magazine-home.css";

export type MagazineHomeModel = {
  title: string; artist: string; album: string | null; year: number;
  heroUrl: string | null; songHref: string; artistHref: string | null;
  albumHref: string | null; yearHref: string | null; rvtr: string;
  editorial: { quote?: string | null; definingMoment?: string | null; trivia?: string | null; story?: string | null; description?: string | null };
  feature?: { title: string; summary?: string | null; href?: string | null } | null;
  event?: { title: string; detail?: string | null; href?: string | null } | null;
  liveLabel: string;
};

function Row({ label, value, href, tone }: { label: string; value: string; href: string | null; tone: string }) {
  const content = <><span className="magazine-row__label">{label}</span><span className="magazine-row__value">{value}</span><span className="magazine-row__arrow" aria-hidden>→</span></>;
  return href ? <Link className={`magazine-row magazine-row--${tone}`} href={href} aria-label={`${label}: ${value}`}>{content}</Link> : <div className={`magazine-row magazine-row--${tone}`} aria-label={`${label}: ${value}`}>{content}</div>;
}

export function Pre1970MagazineHome({ model }: { model: MagazineHomeModel }) {
  const editorial = chooseMagazineEditorial(model.editorial);
  const heroRef = useRef<HTMLImageElement>(null);
  function sampleHeroAccent(image: HTMLImageElement) {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 32; canvas.height = 32;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0, 32, 32);
      const accent = extractMagazineAccent(context.getImageData(0, 0, 32, 32));
      image.closest(".magazine-home")?.setAttribute("style", `--magazine-accent:${accent}`);
    } catch { /* cross-origin or unavailable frames use the deterministic fallback */ }
  }
  useEffect(() => {
    if (heroRef.current?.complete) sampleHeroAccent(heroRef.current);
  }, [model.heroUrl]);
  return <main className="magazine-home">
    <div className="magazine-home__page">
      <header className="magazine-home__header"><span className="magazine-home__section">Music / Archive</span></header>
      <div className="magazine-home__search"><HomeSearchInput /></div>
      <section className="magazine-home__hero" aria-label={`${model.title} by ${model.artist}`}>
        {model.heroUrl ? <img ref={heroRef} src={model.heroUrl} alt="" onLoad={(event) => sampleHeroAccent(event.currentTarget)} /> : <div className="magazine-home__hero-empty" aria-hidden />}
      </section>
      {editorial ? <p className="magazine-home__editorial">{editorial}</p> : null}
      <section className="magazine-home__rows" aria-label="Song details">
        <Row label="Song" value={model.title} href={model.songHref} tone="primary" />
        <Row label="Artist" value={model.artist} href={model.artistHref} tone="secondary" />
        <Row label="Album" value={model.album ?? ""} href={model.albumHref} tone="paper" />
        <Row label="Year" value={String(model.year)} href={model.yearHref} tone="primary" />
      </section>
      {model.feature ? <Link className="magazine-home__feature" href={model.feature.href ?? model.songHref}><span>FEATURE</span><strong>{model.feature.title}</strong><small>{model.feature.summary ?? "Explore the story"} →</small></Link> : null}
      {model.event ? <Link className="magazine-home__event" href={model.event.href ?? model.songHref}><span>IN THE ARCHIVE</span><strong>{model.event.title}</strong><small>{model.event.detail ?? "Open the song experience"} →</small></Link> : null}
      <div className="magazine-home__live"><span className="magazine-home__live-dot" />{model.liveLabel}</div>
    </div>
  </main>;
}
