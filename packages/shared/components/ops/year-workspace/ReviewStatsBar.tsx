export function ReviewStatsBar(props: {
  year: number;
  videoCount: number;
  fillCount: number;
  cocktailCount: number;
}) {
  return (
    <section className="ops-ru-headline" aria-label="Review summary">
      <div className="ops-ru-headline__item">
        <span className="ops-ru-headline__value">{props.year} Videos</span>
      </div>
      <div className="ops-ru-headline__item">
        <span className="ops-ru-headline__value">{props.videoCount}</span>
        <span className="ops-ru-headline__label">Videos</span>
      </div>
      <div className="ops-ru-headline__item">
        <span className="ops-ru-headline__value">{props.cocktailCount}</span>
        <span className="ops-ru-headline__label">Cocktail</span>
      </div>
      <div className="ops-ru-headline__item">
        <span className="ops-ru-headline__value">{props.fillCount}</span>
        <span className="ops-ru-headline__label">Fill</span>
      </div>
    </section>
  );
}
