import type { ReactNode } from "react";

export function OpsQueuePanel(props: {
  id: string;
  title: string;
  subtitle?: string;
  count?: number;
  tone?: "ok" | "warn" | "bad" | "info";
  children: ReactNode;
}) {
  const tone = props.tone || "info";

  return (
    <section className={`ops-panel ops-panel--${tone}`} aria-labelledby={props.id}>
      <header className="ops-panel__header">
        <div className="ops-panel__titleblock">
          <h2 id={props.id} className="ops-panel__title">
            {props.title}
          </h2>
          {props.subtitle ? (
            <p className="ops-panel__subtitle">{props.subtitle}</p>
          ) : null}
        </div>
        {typeof props.count === "number" ? (
          <div className="ops-panel__count" aria-label="Queue count">
            {props.count}
          </div>
        ) : null}
      </header>
      <div className="ops-panel__body">{props.children}</div>
    </section>
  );
}

