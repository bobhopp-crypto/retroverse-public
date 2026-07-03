import Link from "next/link";

import type { MissionDetail } from "@/lib/atlas/mission-types";
import { atlasMissionHref } from "@/lib/atlas/mission-href";

import { AtlasCoverArt, AtlasProgressBar, AtlasProgressRing } from "./AtlasVisuals";

type Props = {
  mission: MissionDetail;
  coverUrl: string | null;
};

export function MissionDetailBoard({ mission, coverUrl }: Props) {
  const missionProgressPct = Math.round((mission.checklistDone / mission.checklistTotal) * 100);
  const rankLabel =
    mission.rank > 0
      ? `#${mission.rank} of ${mission.totalRanked} in ${mission.territory} territory`
      : `Enrichment target in ${mission.territory} territory`;

  return (
    <div className="atlas-mission-page">
      <nav className="atlas-mission-page__back">
        <Link href={mission.territoryHref} prefetch>
          ← Back to {mission.territory} Territory
        </Link>
      </nav>

      <header className="atlas-mission-hero">
        <div className="atlas-mission-hero__art-wrap">
          <AtlasCoverArt
            src={coverUrl}
            alt={`${mission.artist} — ${mission.title}`}
            className="atlas-mission-hero__art"
            priority
          />
          <span className={`atlas-mission-stamp atlas-mission-stamp--${slugStatus(mission.status)}`}>
            {mission.status}
          </span>
        </div>

        <div className="atlas-mission-hero__main">
          <p className="atlas-kicker atlas-kicker--orange">{mission.verb} mission</p>
          <h1 className="atlas-mission-hero__title">{mission.title}</h1>
          <p className="atlas-mission-hero__artist">{mission.artist}</p>

          <div className="atlas-mission-hero__stats">
            <StatPill label="Plays" value={String(mission.playCount)} />
            <StatPill label="Territory" value={mission.territory} />
            <StatPill label="Coverage" value={`${mission.coveragePct}%`} />
            <StatPill label="Priority" value={String(mission.priority)} accent />
          </div>

          <div className="atlas-mission-progress-hero">
            <div className="atlas-mission-progress-hero__head">
              <span className="atlas-kicker">Mission progress</span>
              <strong>
                {mission.checklistDone}/{mission.checklistTotal} tasks · {missionProgressPct}%
              </strong>
            </div>
            <AtlasProgressBar pct={missionProgressPct} className="atlas-mission-progress-hero__bar" />
            <p className="atlas-mission-progress-hero__points">
              <span>{mission.pointsEarned} points earned</span>
              <span> · </span>
              <span>{mission.pointsAvailable} still available</span>
              <span> · </span>
              <span>+{mission.completeBonus} on completion</span>
            </p>
          </div>
        </div>

        <aside className="atlas-mission-impact">
          <p className="atlas-kicker">Territory impact</p>
          <h2 className="atlas-mission-impact__territory">{mission.territory} Territory</h2>
          <dl className="atlas-mission-impact__list">
            <div>
              <dt>Current</dt>
              <dd>{mission.territoryMappedPct}% mapped</dd>
            </div>
            <div>
              <dt>After completion</dt>
              <dd>{mission.territoryMappedAfterPct}% mapped</dd>
            </div>
            <div>
              <dt>Territory rank</dt>
              <dd>{mission.rank > 0 ? `#${mission.rank} mission` : "Unranked"}</dd>
            </div>
          </dl>
          <AtlasProgressRing pct={mission.completenessPct} label="Exhibit" tone="orange" />
        </aside>
      </header>

      <section className="atlas-mission-context" aria-labelledby="mission-context-heading">
        <h2 id="mission-context-heading" className="atlas-kicker">
          Why this song matters
        </h2>
        <p className="atlas-mission-context__lead">
          <strong>{mission.artist}</strong> · <strong>{mission.title}</strong>
        </p>
        <p className="atlas-mission-context__body">
          {mission.playCount} plays in your rotation. Top {mission.rank || "—"} enrichment target
          in the {mission.territory} territory. Coverage currently {mission.completenessPct}%.
          Completing this mission strengthens the {mission.territory} territory and improves future
          Sunday Nights experiences.
        </p>
      </section>

      <section className="atlas-mission-checklist" aria-labelledby="mission-checklist-heading">
        <div className="atlas-mission-checklist__head">
          <h2 id="mission-checklist-heading" className="atlas-mission-checklist__title">
            {mission.title.toUpperCase()}
          </h2>
          <p className="atlas-mission-checklist__sub">Mission checklist</p>
        </div>

        <ul className="atlas-mission-tasks">
          {mission.checklist.map((task) => (
            <li
              key={task.id}
              className={`atlas-mission-task${task.done ? " atlas-mission-task--done" : " atlas-mission-task--open"}`}
            >
              <span className="atlas-mission-task__mark" aria-hidden>
                {task.done ? "✓" : "✗"}
              </span>
              <div className="atlas-mission-task__body">
                <p className="atlas-mission-task__label">{task.label}</p>
                {!task.done && task.points > 0 ? (
                  <p className="atlas-mission-task__reward">+{task.points} Territory Points</p>
                ) : null}
                {!task.done && task.actionLabel && task.actionHref ? (
                  <Link href={task.actionHref} className="atlas-mission-task__action" prefetch={false}>
                    {task.actionLabel} →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        {mission.completenessPct < 75 ? (
          <p className="atlas-mission-complete-bonus">
            Complete mission · <strong>+{mission.completeBonus} Territory Points</strong>
          </p>
        ) : null}
      </section>

      <nav className="atlas-mission-nav" aria-label="Mission queue">
        {mission.prev ? (
          <Link href={atlasMissionHref(mission.prev.rvtr)} className="atlas-mission-nav__link" prefetch>
            <span className="atlas-mission-nav__dir">← Previous mission</span>
            <span className="atlas-mission-nav__track">
              {mission.prev.title} · {mission.prev.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mission-nav__spacer" />
        )}
        {mission.next ? (
          <Link
            href={atlasMissionHref(mission.next.rvtr)}
            className="atlas-mission-nav__link atlas-mission-nav__link--next"
            prefetch
          >
            <span className="atlas-mission-nav__dir">Next mission →</span>
            <span className="atlas-mission-nav__track">
              {mission.next.title} · {mission.next.artist}
            </span>
          </Link>
        ) : (
          <span className="atlas-mission-nav__spacer" />
        )}
      </nav>

      <p className="atlas-mission-page__rank-note">{rankLabel}</p>
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
