"use client";

import { getAnnotatedCard } from "@/lib/ops/studio/operator-guide";

import { useOperatorGuideOptional } from "./OperatorGuideProvider";

type Props = {
  cardId: string;
  children: React.ReactNode;
  className?: string;
};

export function GuideAnnotatedSection({ cardId, children, className }: Props) {
  const guide = useOperatorGuideOptional();
  const card = getAnnotatedCard(cardId);

  return (
    <div className={`rs-guide-annotated ${className ?? ""}`.trim()}>
      {children}
      {guide?.enabled && card ? (
        <aside className="rs-guide-annotated__panel" aria-label={`About ${card.title}`}>
          <p className="rs-guide-annotated__title">{card.title}</p>
          <dl className="rs-guide-annotated__dl">
            <div>
              <dt>Purpose</dt>
              <dd>{card.purpose}</dd>
            </div>
            <div>
              <dt>Monitors</dt>
              <dd>{card.monitors}</dd>
            </div>
            <div>
              <dt>Check</dt>
              <dd>{card.checkFrequency}</dd>
            </div>
            <div>
              <dt>Action when</dt>
              <dd>{card.actionRequired}</dd>
            </div>
          </dl>
        </aside>
      ) : null}
    </div>
  );
}
