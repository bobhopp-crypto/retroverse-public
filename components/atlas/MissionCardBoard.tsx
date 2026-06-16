import Link from "next/link";

import type { MissionGap, MissionWorkspace } from "@/lib/atlas/mission-types";
import { atlasMissionHref } from "@/lib/atlas/mission-href";

import { AtlasCoverArt, AtlasProgressBar, AtlasProgressRing } from "./AtlasVisuals";

type Props = {
  workspace: MissionWorkspace;
  coverUrl: string | null;
  relatedCovers: Record<string, string | null>;
};

const GAP_EMBED_LABEL: Record<MissionGap["kind"], string> = {
  album: "Album candidates & link action",
  cover: "Cover picker & restore",
  commentary: "Style & crowd tag panels",
  tv: "TV appearance search",
  movie: "Movie appearance search",
};

export function MissionCardBoard({ workspace, coverUrl, relatedCovers }: Props) {
  const rankLabel =
    workspace.rank > 0
      ? `#${workspace.rank} of ${workspace.totalRanked} in ${workspace.territory}`
      : `Enrichment target in ${workspace.territory}`;

  const albumsCampaign = workspace.campaigns.find((c) => c.key === "albums");

  return (
    <div className="atlas-mcard-page">
      <header className="atlas-mcard-page__top">
        <Link href={workspace.territoryHref} className="atlas-mcard-page__back" prefetch>
          ← {workspace.territory} Territory
        </Link>
        <p className="atlas-mcard-page__crumb">
          {workspace.verb.toUpperCase()} MISSION · {rankLabel}
        </p>
        <span className={`atlas-mission-stamp atlas-mission-stamp--${slugStatus(workspace.status)}`}>
          {workspace.status}
        </span>
        {workspace.next ? (
          <Link
            href={atlasMissionHref(workspace.next.rvtr)}
            className="atlas-mcard-page__queue-next"
            prefetch
          >
            {workspace.next.title} →
          </Link>
        ) : (
          <span className="atlas-mcard-page__queue-spacer" />
        )}
      </header>

      <section className="atlas-mcard-hero" aria-label="Mission card front">
        <div className="atlas-mcard-hero__art-wrap">
          <AtlasCoverArt
            src={coverUrl}
            alt={`${workspace.artist} — ${workspace.title}`}
            className="atlas-mcard-hero__art"
            priority
          />
        </div>

        <div className="atlas-mcard-hero__identity">
          <p className="atlas-kicker atlas-kicker--orange">{workspace.verb} mission</p>
          <h1 className="atlas-mcard-hero__title">{workspace.title}</h1>
          <p className="atlas-mcard-hero__artist">{workspace.artist}</p>
          <p className="atlas-mcard-hero__meta">
            {workspace.performanceYear ? `${workspace.performanceYear} · ` : ""}
            {workspace.playCount} plays
            {workspace.peakHot100 ? ` · Hot 100 #${workspace.peakHot100}` : ""}
          </p>
          <div className="atlas-mcard-hero__metrics">
            <StatPill label="Shelf coverage" value={`${workspace.shelfCoveragePct}%`} />
            <StatPill label="Priority" value={String(workspace.priority)} accent />
          </div>
        </div>

        <div className="atlas-mcard-hero__score">
          <AtlasProgressRing
            pct={workspace.exhibitDepthPct}
            label="Exhibit depth"
            tone="orange"
            className="atlas-mcard-hero__ring"
          />
        </div>
      </section>

      <section className="atlas-mcard-fill" aria-labelledby="mcard-fill-heading">
        <div className="atlas-mcard-fill__head">
          <h2 id="mcard-fill-heading" className="atlas-mcard-fill__title">
            Fill the card
          </h2>
          <p className="atlas-mcard-fill__summary">
            <strong>{workspace.gaps.length}</strong> slots open ·{" "}
            <strong>+{workspace.pointsAvailable}</strong> pts available ·{" "}
            <strong>+{workspace.completeBonus}</strong> completion bonus
          </p>
        </div>

        <ul className="atlas-mcard-slots">
          {workspace.gaps.map((gap) => (
            <li key={gap.id} className="atlas-mcard-slot">
              <div className="atlas-mcard-slot__head">
                <span className="atlas-mcard-slot__mark" aria-hidden>
                  ✗
                </span>
                <div>
                  <p className="atlas-mcard-slot__label">{gap.label}</p>
                  <p className="atlas-mcard-slot__desc">{gap.description}</p>
                </div>
                <span className="atlas-mcard-slot__pts">+{gap.points} pts</span>
              </div>
              <div className="atlas-mcard-slot__embed" aria-label={`${gap.label} action panel`}>
                <p className="atlas-mcard-slot__embed-kicker">{GAP_EMBED_LABEL[gap.kind]}</p>
                <p className="atlas-mcard-slot__embed-soon">Embedded on this page in Phase D2</p>
              </div>
            </li>
          ))}
        </ul>

        {workspace.gaps.length === 0 ? (
          <p className="atlas-mcard-fill__complete">All slots filled — mission complete.</p>
        ) : (
          <p className="atlas-mcard-fill__bonus">
            Complete all slots · <strong>+{workspace.completeBonus} Territory Points</strong>
          </p>
        )}

        {workspace.seals.length > 0 ? (
          <ul className="atlas-mcard-seals" aria-label="Card seals">
            {workspace.seals.map((seal) => (
              <li key={seal.id} className="atlas-mcard-seal">
                <span aria-hidden>✓</span> {seal.label}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {workspace.relatedByArtist.length > 0 ? (
        <section className="atlas-mcard-shelf" aria-labelledby="mcard-shelf-heading">
          <h2 id="mcard-shelf-heading" className="atlas-kicker">
            Same artist shelf — {workspace.artist}
          </h2>
          <ul className="atlas-mcard-shelf__row">
            {workspace.relatedByArtist.map((related) => (
              <li key={related.rvtr}>
                <Link
                  href={atlasMissionHref(related.rvtr)}
                  className="atlas-mcard-mini"
                  prefetch
                >
                  <AtlasCoverArt
                    src={relatedCovers[related.rvtr] ?? null}
                    alt={`${related.artist} — ${related.title}`}
                    className="atlas-mcard-mini__art"
                  />
                  <span className="atlas-mcard-mini__title">{related.title}</span>
                  <span className="atlas-mcard-mini__meta">
                    {related.playCount} plays · {related.completenessPct}%
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="atlas-mcard-foot">
        <section className="atlas-mcard-impact" aria-labelledby="mcard-impact-heading">
          <h2 id="mcard-impact-heading" className="atlas-kicker">
            Territory impact
          </h2>
          <p className="atlas-mcard-impact__territory">{workspace.territory} Territory</p>
          <p className="atlas-mcard-impact__delta">
            {workspace.territoryMappedPct}% mapped → {workspace.territoryMappedAfterPct}% after
            completion
          </p>
          {albumsCampaign ? (
            <AtlasProgressBar
              pct={albumsCampaign.pct}
              label={`Albums campaign ${albumsCampaign.pct}%`}
              className="atlas-mcard-impact__bar"
            />
          ) : null}
        </section>

        <section className="atlas-mcard-discoveries" aria-labelledby="mcard-disc-heading">
          <h2 id="mcard-disc-heading" className="atlas-kicker">
            Recent discoveries
          </h2>
          <ul className="atlas-mcard-discoveries__list">
            {workspace.discoveries.map((item) => (
              <li key={item}>◆ {item}</li>
            ))}
          </ul>
        </section>
      </footer>

      <nav className="atlas-mcard-queue" aria-label="Mission queue">
        {workspace.prev ? (
          <Link href={atlasMissionHref(workspace.prev.rvtr)} className="atlas-mcard-queue__link" prefetch>
            <span className="atlas-mcard-queue__dir">← Previous</span>
            <span className="atlas-mcard-queue__track">
              {workspace.prev.title} · {workspace.prev.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mcard-queue__spacer" />
        )}
        <p className="atlas-mcard-queue__points">
          <span>{workspace.pointsEarned} earned</span>
          <span> · </span>
          <span>{workspace.pointsAvailable} available</span>
          <span> · </span>
          <span>+{workspace.completeBonus} bonus</span>
        </p>
        {workspace.next ? (
          <Link
            href={atlasMissionHref(workspace.next.rvtr)}
            className="atlas-mcard-queue__link atlas-mcard-queue__link--next"
            prefetch
          >
            <span className="atlas-mcard-queue__dir">Next →</span>
            <span className="atlas-mcard-queue__track">
              {workspace.next.title} · {workspace.next.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mcard-queue__spacer" />
        )}
      </nav>
    </div>
  );
}

function StatPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`atlas-stat-pill${accent ? " atlas-stat-pill--accent" : ""}`}>
      <span className="atlas-stat-pill__label">{label}</span>
      <span className="atlas-stat-pill__value">{value}</span>
    </div>
  );
}

function slugStatus(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "-");
}
