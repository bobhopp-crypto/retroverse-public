import Link from "next/link";

import type { AtlasMission } from "@/lib/atlas/types";
import { atlasMissionHref } from "@/lib/atlas/mission-href";

import { AtlasCoverArt } from "./AtlasVisuals";

type Props = {
  mission: AtlasMission;
  coverUrl?: string | null;
  variant?: "hero" | "card" | "compact";
  href?: string;
};

export function AtlasMissionCard({ mission, coverUrl, variant = "card", href }: Props) {
  const link = href ?? atlasMissionHref(mission.rvtr);
  const className = [
    "atlas-mission-card",
    `atlas-mission-card--${variant}`,
    mission.active ? " atlas-mission-card--active" : "",
  ].join("");

  const body = (
    <>
      <AtlasCoverArt
        src={coverUrl}
        alt={`${mission.artist} — ${mission.title}`}
        className="atlas-mission-card__art"
        priority={variant === "hero"}
      />
      <div className="atlas-mission-card__body">
        <p className="atlas-mission-card__verb">{mission.verb}</p>
        <p className="atlas-mission-card__title">{mission.title}</p>
        <p className="atlas-mission-card__artist">{mission.artist}</p>
        <p className="atlas-mission-card__meta">
          {mission.playCount} plays · {mission.completenessPct}% exhibit · #{mission.rank}
        </p>
        {variant === "hero" ? <span className="atlas-mission-card__deploy">Deploy →</span> : null}
      </div>
      {mission.active && variant !== "hero" ? (
        <span className="atlas-mission-card__stamp" aria-hidden>
          ★
        </span>
      ) : null}
    </>
  );

  if (variant === "compact") {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={link} className={className} prefetch>
      {body}
    </Link>
  );
}
