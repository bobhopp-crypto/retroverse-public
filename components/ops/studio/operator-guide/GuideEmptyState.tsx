import Link from "next/link";

type Props = {
  title: string;
  explanation: string;
  recommendedAction: string;
  actionHref?: string;
  actionLabel?: string;
};

export function GuideEmptyState({
  title,
  explanation,
  recommendedAction,
  actionHref,
  actionLabel,
}: Props) {
  return (
    <section className="rs-guide-empty" aria-labelledby="guide-empty-title">
      <h1 id="guide-empty-title" className="rs-guide-empty__title">
        {title}
      </h1>
      <p className="rs-guide-empty__explain">{explanation}</p>
      <div className="rs-guide-empty__action-box">
        <p className="rs-guide-empty__action-label">Recommended next action</p>
        <p className="rs-guide-empty__action">{recommendedAction}</p>
        {actionHref && actionLabel ? (
          <Link className="rs-guide-empty__link" href={actionHref}>
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
