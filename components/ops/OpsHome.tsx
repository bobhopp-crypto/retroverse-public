import Link from "next/link";
import type { ReactNode } from "react";

import type { OpsHomeData } from "@/lib/ops/load-ops-home";

type Props = {
  data: OpsHomeData;
};

function StatusPill(props: { label: string; tone?: "ok" | "warn" | "idle" | "live" }) {
  const tone = props.tone ?? "idle";
  return <span className={`ops-home__pill ops-home__pill--${tone}`}>{props.label}</span>;
}

function Section(props: { title: string; children: ReactNode }) {
  return (
    <section className="ops-home__section">
      <h2 className="ops-home__section-title">{props.title}</h2>
      <div className="ops-home__section-body">{props.children}</div>
    </section>
  );
}

export function OpsHome({ data }: Props) {
  return (
    <div className="ops-home" aria-label="Ops home">
      <Section title="Today">
        <ul className="ops-home__list">
          <li className="ops-home__row">
            <div className="ops-home__row-main">
              <Link className="ops-home__row-link" href={data.today.sundayNights.href}>
                Sunday Nights
              </Link>
              <p className="ops-home__row-detail">{data.today.sundayNights.detail}</p>
            </div>
            <StatusPill
              label={data.today.sundayNights.status}
              tone={data.today.sundayNights.status === "Live" ? "live" : "idle"}
            />
          </li>
          <li className="ops-home__row">
            <div className="ops-home__row-main">
              <Link className="ops-home__row-link" href={data.today.live.href}>
                Live status
              </Link>
              <p className="ops-home__row-detail">{data.today.live.detail}</p>
            </div>
            <StatusPill
              label={data.today.live.status}
              tone={data.today.live.status === "On air" ? "live" : "idle"}
            />
          </li>
          <li className="ops-home__row ops-home__row--stack">
            <p className="ops-home__row-label">Current enrichment jobs</p>
            <ul className="ops-home__sublist">
              {data.today.enrichmentJobs.map((job) => (
                <li key={job.id}>
                  <Link className="ops-home__sub-link" href={job.href}>
                    {job.label}
                  </Link>
                  <StatusPill
                    label={job.status}
                    tone={job.status === "running" ? "ok" : job.status === "queued" ? "warn" : "idle"}
                  />
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </Section>

      <Section title="Attention needed">
        <ul className="ops-home__attention">
          {data.attention.map((item) => (
            <li key={item.id}>
              <Link className={`ops-home__attention-link ops-home__attention-link--${item.tone}`} href={item.href}>
                <span className="ops-home__attention-count">{item.count}</span>
                <span className="ops-home__attention-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Automation">
        <ul className="ops-home__list">
          <li className="ops-home__row">
            <div className="ops-home__row-main">
              <Link className="ops-home__row-link" href={data.automation.coverBackfill.href}>
                {data.automation.coverBackfill.label}
              </Link>
            </div>
            <StatusPill
              label={data.automation.coverBackfill.running ? "Running" : "Idle"}
              tone={data.automation.coverBackfill.running ? "ok" : "idle"}
            />
          </li>
          <li className="ops-home__row">
            <div className="ops-home__row-main">
              <span className="ops-home__row-link ops-home__row-link--static">Covers added today</span>
              <p className="ops-home__row-detail">
                <strong>{data.automation.coverBackfill.coversToday}</strong> covers promoted
              </p>
            </div>
          </li>
        </ul>
      </Section>

      <Section title="Discoveries">
        <ul className="ops-home__list">
          {data.discoveries.map((item) => (
            <li key={item.id} className="ops-home__row">
              <div className="ops-home__row-main">
                <Link className="ops-home__row-link" href={item.href}>
                  {item.label}
                </Link>
                <p className="ops-home__row-detail">{item.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tools">
        <ul className="ops-home__tools">
          {data.tools.map((tool) => (
            <li key={tool.id}>
              <Link className="ops-home__tool-card" href={tool.href}>
                <span className="ops-home__tool-label">{tool.label}</span>
                <span className="ops-home__tool-desc">{tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
