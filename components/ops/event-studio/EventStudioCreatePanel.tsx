import Link from "next/link";

import type { EventStudioCreateTool } from "@/lib/ops/event-studio/types";

type Props = {
  tools: EventStudioCreateTool[];
};

export function EventStudioCreatePanel({ tools }: Props) {
  return (
    <div className="ops-event-studio__create">
      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Event Producer">
        <h2 className="ops-event-studio__panel-title">Event Producer</h2>
        <p className="ops-event-studio__hint">
          Paste a plain-English event brief. Local Ollama extracts schedule, venue, passes, giveaway rules,
          and recommended modules.
        </p>
        <div className="ops-event-studio__actions">
          <Link href="/ops/event-studio/producer" className="ops-event-studio__action">
            Open Event Producer
          </Link>
        </div>
      </section>

      <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Create tools">
        <h2 className="ops-event-studio__panel-title">Generate for this event</h2>
        <p className="ops-event-studio__hint">
          Generators inherit Identity settings. Pass generation is live today; additional tools open
          as coming-soon panels until generation ships.
        </p>
        <div className="ops-event-studio__cards">
          {tools.map((tool) => {
            const className = [
              "ops-event-studio__card",
              tool.status === "active" ? "ops-event-studio__card--active" : "ops-event-studio__card--planned",
            ].join(" ");

            const body = (
              <>
                <div className="ops-event-studio__card-head">
                  <h2>{tool.title}</h2>
                  <span className="ops-event-studio__card-badge">
                    {tool.status === "active" ? "Ready" : "Planned"}
                  </span>
                </div>
                <p>{tool.description}</p>
                <span
                  className={
                    tool.status === "active"
                      ? "ops-event-studio__card-cta"
                      : "ops-event-studio__card-cta ops-event-studio__card-cta--dim"
                  }
                >
                  {tool.status === "active" ? "Open generator →" : "Open panel →"}
                </span>
              </>
            );

            if (tool.href) {
              return (
                <Link key={tool.id} href={tool.href} className={className}>
                  {body}
                </Link>
              );
            }

            return (
              <article key={tool.id} className={className} aria-disabled="true">
                {body}
              </article>
            );
          })}
        </div>
      </section>

      <section className="ops-event-studio__panel" aria-label="Collectible library">
        <h2 className="ops-event-studio__panel-title">Collectible Library</h2>
        <p className="ops-event-studio__hint">
          Browse prior generations, exports, and production-ready passes for this event.
        </p>
        <div className="ops-event-studio__actions">
          <Link href="/ops/content-creator" className="ops-event-studio__action">
            Open Collectible Library
          </Link>
        </div>
      </section>
    </div>
  );
}
