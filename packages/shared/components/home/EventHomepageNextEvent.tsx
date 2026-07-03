type Props = {
  title: string;
  when: string;
};

export function EventHomepageNextEvent({ title, when }: Props) {
  return (
    <section className="event-next" aria-label="Next event">
      <p className="event-next__label">Next Event</p>
      <p className="event-next__title">{title}</p>
      <p className="event-next__when">{when}</p>
    </section>
  );
}
