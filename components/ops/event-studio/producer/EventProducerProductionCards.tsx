"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductionModuleCard, ProductionModuleId } from "@/lib/ops/event-studio/producer/module-status";
import { productionModuleStatusLabel } from "@/lib/ops/event-studio/producer/module-status";

type Props = {
  cards: ProductionModuleCard[];
  onStatusChange?: () => void;
};

function statusClass(status: ProductionModuleCard["status"]): string {
  return `es-producer__module-status es-producer__module-status--${status.toLowerCase().replace(/_/g, "-")}`;
}

async function markInProgress(moduleId: ProductionModuleId): Promise<void> {
  await fetch("/api/ops/event-studio/producer/modules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ moduleId, status: "IN_PROGRESS" }),
  });
}

export function EventProducerProductionCards({ cards, onStatusChange }: Props) {
  const router = useRouter();

  async function handleAction(card: ProductionModuleCard) {
    if (card.status === "NOT_STARTED" || card.status === "GENERATED") {
      await markInProgress(card.id);
      onStatusChange?.();
    }
    router.push(card.href);
  }

  return (
    <section
      className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__pipeline"
      aria-label="Production pipeline"
    >
      <h2 className="ops-event-studio__panel-title">Production Pipeline</h2>
      <p className="ops-event-studio__hint">
        Sunday workflow: Passes → Giveaway → Homepage. Each step inherits the analyzed plan.
      </p>
      <div className="es-producer__module-grid">
        {cards.map((card) => (
          <article
            key={card.id}
            className={`es-producer__module-card${card.ready ? " es-producer__module-card--ready" : ""}`}
          >
            <div className="es-producer__module-head">
              <h3>{card.title}</h3>
              <span className={statusClass(card.status)}>{productionModuleStatusLabel(card.status)}</span>
            </div>
            <p className="es-producer__module-copy">{card.description}</p>
            {card.uses.length > 0 ? (
              <ul className="es-producer__module-uses">
                {card.uses.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              className="es-producer__btn es-producer__btn--primary es-producer__module-action"
              onClick={() => void handleAction(card)}
            >
              {card.actionLabel}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
