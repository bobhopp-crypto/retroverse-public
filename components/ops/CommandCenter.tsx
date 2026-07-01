"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  COMMAND_CENTER_DEPARTMENTS,
  COMMAND_CENTER_LEGACY_ENTRY,
  COMMAND_CENTER_LEGACY_LINKS,
} from "@/lib/ops/command-center";
import type {
  CommandCenterDashboard,
  CommandCenterModule,
  ModuleStatusTone,
} from "@/lib/ops/command-center/types";

type Props = {
  data: CommandCenterDashboard;
};

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(ms);
}

function statusClass(tone: ModuleStatusTone): string {
  return `cc-mc__status cc-mc__status--${tone}`;
}

function stripClass(tone: ModuleStatusTone): string {
  return `cc-mc__strip cc-mc__strip--${tone}${tone === "blue" ? " cc-mc__strip--pulse" : ""}`;
}

function AnimatedProgress({ target }: { target: number }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setWidth(Math.round(Math.min(100, Math.max(0, target * 100))));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="cc-mc__progress-track" role="presentation">
      <div className="cc-mc__progress-fill" style={{ width: `${width}%` }} />
    </div>
  );
}

function ModuleCard({ module }: { module: CommandCenterModule }) {
  return (
    <article className={`cc-mc__module cc-mc__module--${module.status}`}>
      <div className={stripClass(module.healthStrip)} aria-hidden />

      <header className="cc-mc__module-head">
        <span className={statusClass(module.status)} aria-hidden />
        <div>
          <h2>{module.title}</h2>
          <p>{module.statusLabel}</p>
        </div>
      </header>

      {module.attentionBadges.length > 0 ? (
        <div className="cc-mc__badges" aria-label="Attention needed">
          {module.attentionBadges.map((badge) => (
            <span key={`${module.id}-${badge}`} className="cc-mc__badge">
              {badge}
            </span>
          ))}
        </div>
      ) : null}

      <div className="cc-mc__metric-row">
        <p className="cc-mc__metric">{module.primaryMetric}</p>
        <span className="cc-mc__progress-pill">{module.progressLabel}</span>
      </div>

      <AnimatedProgress target={module.progress} />
      <p className="cc-mc__event">{module.lastEvent}</p>

      <dl className="cc-mc__secondary">
        {module.secondaryMetrics.map((metric) => (
          <div key={`${module.id}-${metric.label}`}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
          </div>
        ))}
      </dl>

      <footer className="cc-mc__module-foot">
        <span className="cc-mc__updated">Updated {formatUpdatedAt(module.lastUpdated)}</span>
        <Link href={module.actionHref} className="cc-mc__action">
          {module.action}
        </Link>
      </footer>
    </article>
  );
}

export function CommandCenter({ data }: Props) {
  return (
    <div className="cc-mc">
      <header className="cc-mc__hero">
        <div className="cc-mc__hero-status">
          <span className={statusClass(data.overallStatus)} aria-hidden />
          <div>
            <p className="cc-mc__kicker">Retroverse Mission Control</p>
            <h1 className="cc-mc__title">Command Center</h1>
            <p className="cc-mc__headline">{data.overallHeadline}</p>
            <p className="cc-mc__detail">{data.overallDetail}</p>
          </div>
        </div>
        <p className="cc-mc__timestamp">Snapshot {formatUpdatedAt(data.generatedAt)}</p>
      </header>

      <section className="cc-mc__grid" aria-label="Mission modules">
        {data.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}
      </section>

      <details className="cc-mc__launchpad">
        <summary>All routes</summary>
        <div className="cc-mc__launchpad-grid">
          {COMMAND_CENTER_DEPARTMENTS.map((department) => (
            <div key={department.id} className="cc-mc__launchpad-dept">
              <h3 style={{ color: department.accent }}>{department.title}</h3>
              <div className="cc-mc__launchpad-links">
                {department.links.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="cc-mc__launchpad-dept">
            <h3 style={{ color: "#6B7280" }}>Legacy</h3>
            <div className="cc-mc__launchpad-links">
              <Link href={COMMAND_CENTER_LEGACY_ENTRY.href}>{COMMAND_CENTER_LEGACY_ENTRY.label}</Link>
              {COMMAND_CENTER_LEGACY_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
