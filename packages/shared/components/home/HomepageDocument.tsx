"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import { ArtistCover } from "@/app/artist/[slug]/artist-cover";
import type { HomepageDocumentModel } from "@/lib/home/homepage-document-types";

const ExperienceFlow = dynamic(
  () =>
    import("@/components/retroverse/experience/ExperienceFlow").then((mod) => mod.ExperienceFlow),
  { ssr: false },
);

type Props = {
  model: HomepageDocumentModel;
};

export function HomepageDocument({ model }: Props) {
  const [experienceReady, setExperienceReady] = useState(false);

  useEffect(() => {
    setExperienceReady(true);
  }, [model.rvtr]);

  const metaLines = [
    model.year != null ? String(model.year) : null,
    model.albumTitle,
    model.rvtr,
  ].filter(Boolean) as string[];

  const chapters = model.experience?.chapters ?? [];

  return (
    <article className="home-v1__document">
      <section className="home-v1__hero" aria-label="Song hero">
        <div className="home-v1__hero-art">
          <ArtistCover
            src={model.heroUrl ?? model.coverUrl}
            alt=""
            className="home-v1__hero-img"
            fallbackClassName="home-v1__hero-fallback"
            fallbackVariant="plate"
            plateDensity="dense"
            placeholderContext={{
              artist: model.artist,
              album: model.albumTitle ?? model.title,
              releaseYear: model.year,
            }}
          />
        </div>
        <div className="home-v1__hero-copy">
          <h1 className="home-v1__hero-title">{model.title}</h1>
          <p className="home-v1__hero-artist">{model.artist}</p>
          {metaLines.length > 0 ? (
            <ul className="home-v1__hero-meta">
              {metaLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <div className="home-v1__publisher-body">
        {experienceReady && chapters.length > 0 ? (
          <ExperienceFlow experience={model.experience} className="home-v1__experience-flow" />
        ) : null}
      </div>
    </article>
  );
}
