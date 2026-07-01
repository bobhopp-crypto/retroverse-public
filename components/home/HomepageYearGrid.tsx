import Link from "next/link";

type Props = {
  years: number[];
};

export function HomepageYearGrid({ years }: Props) {
  return (
    <section className="home-years" aria-label="Browse by year">
      <div className="home-row__head">
        <h2 className="home-row__title">Browse by Year</h2>
      </div>
      <div className="home-years__grid">
        {years.map((year) => (
          <Link key={year} href={`/rv/${year}`} className="home-years__pill">
            {year}
          </Link>
        ))}
      </div>
    </section>
  );
}
