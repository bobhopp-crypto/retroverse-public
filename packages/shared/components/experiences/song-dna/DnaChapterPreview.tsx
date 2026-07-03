"use client";

import type { SongDnaChapter, SongDnaExperience } from "@/lib/experiences/song-dna/types";

type Props = {
  chapter: SongDnaChapter;
  experience: SongDnaExperience;
};

export function DnaChapterPreview({ chapter, experience }: Props) {
  const palette = experience.visualLanguage.palette;

  switch (chapter.id) {
    case "identity":
      return (
        <div className="sdna-beat sdna-beat--identity">
          <div className="sdna-beat__fingerprint" style={{ borderColor: palette[2] }}>
            <div className="sdna-beat__helix" aria-hidden />
            <ul className="sdna-beat__traits">
              {(chapter.payload.traits as string[]).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "energy":
      return (
        <div className="sdna-beat sdna-beat--energy">
          <div className="sdna-beat__wave" aria-hidden />
          <p className="sdna-beat__stat">{String(chapter.payload.energy ?? "—")} energy</p>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "rhythm":
      return (
        <div className="sdna-beat sdna-beat--rhythm">
          <div className="sdna-beat__pulse-rings" aria-hidden>
            <span /><span /><span />
          </div>
          <p className="sdna-beat__stat">
            {typeof chapter.payload.tempo === "number"
              ? `${Math.round(chapter.payload.tempo)} BPM`
              : "—"}{" "}
            · {String(chapter.payload.danceability ?? "")}
          </p>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "harmony":
      return (
        <div className="sdna-beat sdna-beat--harmony">
          <div
            className="sdna-beat__color-field"
            style={{
              background: `linear-gradient(135deg, ${palette[0]}, ${palette[1] ?? palette[0]}, ${palette[3] ?? palette[0]})`,
            }}
            aria-hidden
          />
          <p className="sdna-beat__mega">{String(chapter.payload.key ?? "—")}</p>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "instrumentation":
      return (
        <div className="sdna-beat sdna-beat--instruments">
          <div className="sdna-beat__orbit" aria-hidden>
            <span className="sdna-beat__orbit-core" />
            <span className="sdna-beat__orbit-node sdna-beat__orbit-node--1" />
            <span className="sdna-beat__orbit-node sdna-beat__orbit-node--2" />
            <span className="sdna-beat__orbit-node sdna-beat__orbit-node--3" />
          </div>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "vocals":
      return (
        <div className="sdna-beat sdna-beat--vocals">
          <div className="sdna-beat__vocal-ribbon" aria-hidden />
          <p className="sdna-beat__stat">{String(chapter.payload.delivery ?? "Vocal")}</p>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "production":
      return (
        <div className="sdna-beat sdna-beat--production">
          <p className="sdna-beat__eyebrow">Production space</p>
          <p className="sdna-beat__title">{String(chapter.payload.studio ?? "Studio craft")}</p>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    case "similarities": {
      const neighbors = chapter.payload.neighbors as Array<{ title: string; rvtr: string; peak: number | null }>;
      return (
        <div className="sdna-beat sdna-beat--similarities">
          <ul className="sdna-beat__constellation">
            {neighbors.map((n) => (
              <li key={n.rvtr}>
                <span>{n.title}</span>
                {n.peak != null ? <span>#{n.peak}</span> : null}
              </li>
            ))}
          </ul>
          <p className="sdna-beat__hook">{chapter.narrativeHook}</p>
        </div>
      );
    }
    case "legacy":
      return (
        <div className="sdna-beat sdna-beat--legacy">
          <ul className="sdna-beat__legacy-threads">
            {(chapter.payload.threads as string[]).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      );
    default:
      return <p className="sdna-beat__hook">{chapter.narrativeHook}</p>;
  }
}
