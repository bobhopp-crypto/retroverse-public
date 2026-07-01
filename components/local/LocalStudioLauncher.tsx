"use client";

import Link from "next/link";

import type { LocalStudioLauncherData } from "@/lib/local/load-local-studio-status";

type Props = {
  data: LocalStudioLauncherData;
};

const LAUNCH_ACTIONS = [
  { key: "commandCenter", label: "Open Command Center" },
  { key: "atlasLibrary", label: "Open Library" },
  { key: "scriptLauncher", label: "Open Script Launcher" },
  { key: "systemMap", label: "Open System Map" },
  { key: "architecture", label: "Open Architecture" },
  { key: "databaseExplorer", label: "Open Database Explorer" },
  { key: "diagnoseLive", label: "Diagnose Live" },
] as const;

export function LocalStudioLauncher({ data }: Props) {
  const opsReady = data.opsEnabled;

  return (
    <div className="local-studio">
      <header className="local-studio__hero">
        <p className="local-studio__eyebrow">Retroverse Local Studio</p>
        <h1 className="local-studio__title">Local Studio Online</h1>
        <p className="local-studio__lead">
          Bookmark this page or double-click <code>Retroverse Studio.command</code> to return here.
        </p>
      </header>

      <section className="local-studio__actions" aria-label="Studio launch actions">
        {LAUNCH_ACTIONS.map((action) => {
          const href = data.links[action.key];
          if (!opsReady) {
            return (
              <span
                key={action.key}
                className="local-studio__action local-studio__action--disabled"
                title="Requires RETROVERSE_OPS=1"
              >
                {action.label}
              </span>
            );
          }
          return (
            <Link key={action.key} href={href} className="local-studio__action">
              {action.label}
            </Link>
          );
        })}
      </section>

      {!opsReady ? (
        <section className="local-studio__offline" aria-label="Ops environment offline">
          <article className="local-studio__card local-studio__card--warn">
            <h2>Ops Environment</h2>
            <p className="local-studio__card-status">Offline</p>
            <p>{data.services.find((s) => s.id === "ops-env")?.detail}</p>
            <p className="local-studio__next">
              <strong>Next:</strong>{" "}
              {data.services.find((s) => s.id === "ops-env")?.nextAction}
            </p>
          </article>
        </section>
      ) : null}

      {data.offlineServices.filter((service) => service.id !== "ops-env").length > 0 ? (
        <section className="local-studio__offline" aria-label="Offline services">
          <h2 className="local-studio__section-title">Services Need Attention</h2>
          <div className="local-studio__offline-grid">
            {data.offlineServices
              .filter((service) => service.id !== "dev-server" && service.id !== "ops-env")
              .map((service) => (
                <article key={service.id} className="local-studio__card">
                  <h3>{service.label}</h3>
                  <p className="local-studio__card-status">Offline</p>
                  <p>{service.detail}</p>
                  <p className="local-studio__next">
                    <strong>Next:</strong> {service.nextAction}
                  </p>
                </article>
              ))}
          </div>
        </section>
      ) : null}

      <section className="local-studio__status" aria-label="All service status">
        <h2 className="local-studio__section-title">Service Status</h2>
        <dl className="local-studio__status-grid">
          {data.services.map((service) => (
            <div
              key={service.id}
              className={`local-studio__status-item${service.online ? " local-studio__status-item--ok" : " local-studio__status-item--bad"}`}
            >
              <dt>{service.label}</dt>
              <dd>{service.online ? "Online" : "Offline"}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="local-studio__foot">
        Launcher script: <code>tools/mac/Retroverse Studio.command</code>
      </p>
    </div>
  );
}
