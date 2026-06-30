import Link from "next/link";

import type { EventStudioWorkflowItem } from "@/lib/ops/event-studio/types";

type Props = {
  title: string;
  lead: string;
  items: EventStudioWorkflowItem[];
};

export function EventStudioWorkflowBoard({ title, lead, items }: Props) {
  return (
    <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label={title}>
      <h2 className="ops-event-studio__panel-title">{title}</h2>
      <p className="ops-event-studio__hint">{lead}</p>
      <div className="ops-event-studio__workflow">
        {items.map((item) =>
          item.href ? (
            <Link key={item.id} href={item.href} className="ops-event-studio__workflow-item">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Link>
          ) : (
            <article key={item.id} className="ops-event-studio__workflow-item ops-event-studio__workflow-item--planned">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ),
        )}
      </div>
    </section>
  );
}
