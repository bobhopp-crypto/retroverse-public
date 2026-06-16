import Link from "next/link";

import { atlasMissionHref } from "@/lib/atlas/mission-href";
import type { TerritoryCard } from "@/lib/atlas/types";
import { TERRITORY_MISSION_DETAIL } from "@/lib/atlas/resolve-covers";
import { worldMapRollup } from "@/lib/atlas/world-map-data";

import { AtlasCoverArt, AtlasProgressBar, AtlasProgressRing } from "./AtlasVisuals";

type Props = {
  territories: TerritoryCard[];
  coverByTerritoryId: Record<string, string | null>;
};

export function WorldMapBoard({ territories, coverByTerritoryId }: Props) {
  const rollup = worldMapRollup(territories);
  const focus = territories.find((t) => t.emphasized);
  const focusMission = focus ? TERRITORY_MISSION_DETAIL[focus.id] : null;
  const focusCover = focus ? coverByTerritoryId[focus.id] : null;

  return (
    <div className="atlas-world">
      <header className="atlas-world__head">
        <div>
          <p className="atlas-kicker">Performance Universe</p>
          <h1 className="atlas-world__title">Your Collection Campaign</h1>
        </div>
        {focus && focusMission ? (
          <Link href={atlasMissionHref("RVTR097615")} className="atlas-world__hero-mission" prefetch>
            <AtlasCoverArt
              src={focusCover}
              alt={`${focusMission.artist} — ${focusMission.title}`}
              className="atlas-world__hero-art"
              priority
            />
            <div className="atlas-world__hero-copy">
              <p className="atlas-kicker atlas-kicker--orange">What matters most</p>
              <p className="atlas-world__hero-verb">{focusMission.verb}</p>
              <p className="atlas-world__hero-track">{focusMission.title}</p>
              <p className="atlas-world__hero-artist">{focusMission.artist}</p>
            </div>
          </Link>
        ) : null}
      </header>

      <div className="atlas-world__grid">
        {territories.map((territory) => (
          <TerritoryGameCard
            key={territory.id}
            territory={territory}
            coverUrl={coverByTerritoryId[territory.id]}
            mission={TERRITORY_MISSION_DETAIL[territory.id]}
          />
        ))}
      </div>

      <footer className="atlas-world__foot">
        <div className="atlas-world__rollup">
          <div className="atlas-stat-chip">
            <span className="atlas-stat-chip__num">{rollup.owned.toLocaleString()}</span>
            <span className="atlas-stat-chip__label">Owned</span>
          </div>
          <div className="atlas-stat-chip atlas-stat-chip--missing">
            <span className="atlas-stat-chip__num">{rollup.missing.toLocaleString()}</span>
            <span className="atlas-stat-chip__label">Missing</span>
          </div>
          <AtlasProgressRing pct={rollup.coveragePct} label="Coverage" tone="teal" />
        </div>
        {focus?.slug && focusMission ? (
          <Link href={atlasMissionHref("RVTR097615")} className="atlas-deploy-strip" prefetch>
            <span className="atlas-deploy-strip__label">Next move</span>
            <span className="atlas-deploy-strip__action">
              Deploy → {focusMission.title}
            </span>
            <span className="atlas-deploy-strip__territory">{focus.label} Territory</span>
          </Link>
        ) : null}
      </footer>
    </div>
  );
}

function TerritoryGameCard({
  territory,
  coverUrl,
  mission,
}: {
  territory: TerritoryCard;
  coverUrl?: string | null;
  mission?: { verb: string; title: string; artist: string };
}) {
  const mappedPct = territory.exhibitDepthPct ?? territory.coveragePct;
  const inner = (
    <>
      <div className="atlas-game-card__top">
        <h2 className="atlas-game-card__title">{territory.label}</h2>
        <AtlasProgressRing
          pct={territory.coveragePct}
          label="Cov"
          tone={territory.emphasized ? "orange" : "teal"}
          className="atlas-game-card__ring"
        />
      </div>

      {mission ? (
        <div className="atlas-game-card__mission">
          <AtlasCoverArt
            src={coverUrl}
            alt={`${mission.artist} — ${mission.title}`}
            className="atlas-game-card__art"
            priority={territory.emphasized}
          />
          <div className="atlas-game-card__mission-copy">
            <p className="atlas-game-card__verb">{mission.verb}</p>
            <p className="atlas-game-card__track">{mission.title}</p>
            <p className="atlas-game-card__artist">{mission.artist}</p>
          </div>
        </div>
      ) : (
        <div className="atlas-game-card__mission atlas-game-card__mission--empty">
          <AtlasCoverArt src={null} alt="" className="atlas-game-card__art" />
          <p className="atlas-game-card__empty">Uncharted · no active mission</p>
        </div>
      )}

      <div className="atlas-game-card__stats">
        <span>
          <strong>{territory.owned}</strong> owned
        </span>
        <span>
          <strong>{territory.missing}</strong> missing
        </span>
      </div>

      <AtlasProgressBar
        pct={mappedPct}
        label={territory.exhibitDepthPct != null ? `${mappedPct}% mapped` : `${mappedPct}% coverage`}
        className="atlas-game-card__bar"
      />

      <p className={`atlas-game-card__status atlas-game-card__status--${territory.status.replace(/\s+/g, "-").toLowerCase()}`}>
        {territory.status}
      </p>
      {territory.emphasized ? <span className="atlas-game-card__stamp">Active territory</span> : null}
    </>
  );

  const className = `atlas-game-card${territory.emphasized ? " atlas-game-card--emphasized" : ""}${territory.slug ? "" : " atlas-game-card--muted"}`;

  if (territory.slug) {
    return (
      <Link href={`/ops/atlas/${territory.slug}`} className={className} prefetch>
        {inner}
      </Link>
    );
  }

  return <article className={className}>{inner}</article>;
}
