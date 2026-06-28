import Link from "next/link";

import type { LivingProductionCard } from "@/lib/ops/studio/living/types";

type Props = {
  packages?: LivingProductionCard[] | null;
};

export function MissionControlRecentPackages({ packages }: Props) {
  const items = packages ?? [];

  return (
    <section className="rs-mc-recent" aria-label="Recent packages">
      <div className="rs-mc-recent__head">
        <h2 className="rs-mc-section-title">Recent Packages</h2>
        <Link href="/ops/studio/publisher/museum" className="rs-mc-recent__all">
          Browse all published →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rs-mc-recent__empty">
          Published packages will appear here with artwork as Studio completes work.
        </p>
      ) : (
        <div className="rs-mc-recent__grid">
          {items.slice(0, 8).map((pkg) => (
            <Link key={pkg.rvtr} href={pkg.href} className="rs-mc-recent__card">
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
              <div className="rs-mc-recent__meta">
                <p className="rs-mc-recent__artist">{pkg.artist}</p>
                <h3 className="rs-mc-recent__title">{pkg.title}</h3>
                {pkg.subtitle ? <p className="rs-mc-recent__sub">{pkg.subtitle}</p> : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
