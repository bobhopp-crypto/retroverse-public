"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { CollectorDashboardCardView } from "@/lib/ops/studio/collector/presentation";
import type { CollectorDashboardStats } from "@/lib/ops/studio/collector/types";
import { getStudioDepartment } from "@/lib/ops/studio/departments";

type Props = {
  initialStats: CollectorDashboardStats;
  initialCard: CollectorDashboardCardView;
  packageCount?: number;
};

export function CollectorLiveCard({ initialStats, initialCard, packageCount = 0 }: Props) {
  const dept = getStudioDepartment("collector");
  const [stats, setStats] = useState(initialStats);
  const [card, setCard] = useState(initialCard);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/ops/studio/collector/progress", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          stats: CollectorDashboardStats;
          dashboardCard?: CollectorDashboardCardView;
        };
        if (!cancelled && data.ok) {
          setStats(data.stats);
          if (data.dashboardCard) setCard(data.dashboardCard);
        }
      } catch {
        /* ignore */
      }
    }

    poll();
    const id = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!dept) return null;

  const moodClass =
    card.mood === "Working"
      ? "ops-collector-dash__badge--working"
      : card.mood === "Resting"
        ? "ops-collector-dash__badge--resting"
        : "ops-collector-dash__badge--ready";

  return (
    <article className="ops-studio__dept-card ops-studio__dept-card--live ops-collector-dash">
      <div className="ops-studio__dept-card-head">
        <span className="ops-studio__dept-icon" aria-hidden>
          {dept.icon}
        </span>
        <div>
          <h2 className="ops-studio__dept-name">{dept.name}</h2>
          <p className="ops-studio__dept-mission">{dept.mission}</p>
        </div>
        <span className={`ops-collector-dash__badge ${moodClass}`}>{card.mood}</span>
      </div>

      <dl className="ops-collector-dash__stats">
        <div className="ops-collector-dash__stat ops-collector-dash__stat--hero">
          <dt>Currently</dt>
          <dd>{card.currentLabel}</dd>
        </div>
        <div className="ops-collector-dash__stat">
          <dt>Today&apos;s discoveries</dt>
          <dd>
            {card.todayDiscoveries > 0
              ? `${card.todayDiscoveries} facts`
              : "None yet today"}
          </dd>
        </div>
        <div className="ops-collector-dash__stat">
          <dt>Research packages</dt>
          <dd>{packageCount > 0 ? packageCount : "None yet"}</dd>
        </div>
        <div className="ops-collector-dash__stat">
          <dt>Songs completed</dt>
          <dd>{card.songsCompleted > 0 ? card.songsCompleted : "None yet today"}</dd>
        </div>
        <div className="ops-collector-dash__stat">
          <dt>Knowledge added</dt>
          <dd>{stats.recentlyCompleted.length > 0 ? card.knowledgeAdded : "Not yet"}</dd>
        </div>
      </dl>

      <Link className="ops-studio__dept-cta" href={dept.href}>
        {dept.openLabel}
      </Link>
    </article>
  );
}
