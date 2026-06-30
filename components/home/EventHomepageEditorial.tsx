type EditorialCopy = {
  eyebrow: string;
  headline: string;
  paragraphs: readonly string[];
};

type Props = {
  editorial: EditorialCopy;
};

export function EventHomepageEditorial({ editorial }: Props) {
  return (
    <article className="event-editorial" aria-label="Editorial">
      <p className="event-editorial__eyebrow">{editorial.eyebrow}</p>
      <h2 className="event-editorial__headline">{editorial.headline}</h2>
      <div className="event-editorial__body">
        {editorial.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="event-editorial__p">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  );
}
