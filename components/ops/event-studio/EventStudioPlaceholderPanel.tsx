type Props = {
  title: string;
  lead: string;
  bullets?: string[];
};

export function EventStudioPlaceholderPanel({ title, lead, bullets }: Props) {
  return (
    <section className="ops-event-studio__placeholder" aria-label={title}>
      <div className="ops-event-studio__placeholder-inner">
        <p className="ops-event-studio__placeholder-kicker">Coming soon</p>
        <h2>{title}</h2>
        <p>{lead}</p>
        {bullets?.length ? (
          <ul>
            {bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
