import Link from "next/link";

import type { LivingProductionCard } from "@/lib/ops/studio/living/types";
import {
  chartJourneyPath,
  patronExperiencePath,
  publisherWorkspacePath,
} from "@/lib/retroverse/published-launch-paths";
import { productionTrackerPath } from "@/lib/ops/studio/production-tracker/paths";

type Props = {
  packages?: LivingProductionCard[] | null;
};

export function MissionControlRecentPackages({ packages }: Props) {
  const items = packages ?? [];

  return (
    <section className="rs-mc-recent" aria-label="Recent packages">
      <div className="rs-mc-recent__head">
        <h2 className="rs-mc-section-title">Recent Published</h2>
        <Link href="/retroverse/experiences" className="rs-mc-recent__all">
          Experience Gallery →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rs-mc-recent__empty">
          Published packages will appear here with artwork as Studio completes work.
        </p>
      ) : (
        <div className="rs-mc-recent__grid">
          {items.slice(0, 8).map((pkg) => (
            <article key={pkg.rvtr} className="rs-mc-recent__card">
              <Link href={chartJourneyPath(pkg.rvtr)} className="rs-mc-recent__art-link">
                <div className="rs-mc-recent__art-wrap">
                  {pkg.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pkg.coverUrl} alt="" className="rs-mc-recent__art" />
                  ) : (
                    <div className="rs-mc-recent__art rs-mc-recent__art--fallback" aria-hidden>
                      {pkg.title.slice(0, 1)}
                    </div>
                  )}
                </div>
              </Link>
              <div className="rs-mc-recent__meta">
                <p className="rs-mc-recent__rvtr">{pkg.rvtr}</p>
                <p className="rs-mc-recent__artist">{pkg.artist}</p>
                <h3 className="rs-mc-recent__title">
                  <Link href={chartJourneyPath(pkg.rvtr)}>{pkg.title}</Link>
                </h3>
                <p className="rs-mc-recent__sub">
                  {pkg.year != null ? `${pkg.year} · ` : ""}
                  {pkg.stageLabel ?? "Published"}
                </p>
                <div className="rs-mc-recent__actions">
                  <Link href={chartJourneyPath(pkg.rvtr)} className="rs-mc-recent__btn">
                    Chart Journey
                  </Link>
                  <Link
                    href={patronExperiencePath(pkg.rvtr)}
                    className="rs-mc-recent__btn rs-mc-recent__btn--secondary"
                  >
                    Patron Experience
                  </Link>
                  <Link
                    href={productionTrackerPath(pkg.rvtr)}
                    className="rs-mc-recent__btn rs-mc-recent__btn--secondary"
                  >
                    Tracker
                  </Link>
                  <Link
                    href={publisherWorkspacePath(pkg.rvtr)}
                    className="rs-mc-recent__btn rs-mc-recent__btn--secondary"
                  >
                    Publisher
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
