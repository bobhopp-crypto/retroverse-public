import Link from "next/link";

import { Hot100YearJump } from "../hot100/year-jump";

import "../hot100/hot100.css";

export function Hot100HomeEntry() {
  return (
    <section className="hot100-home" aria-label="Year-End Hot 100">
      <div className="hot100-home__sheet">
        <div className="hot100-home__copy">
          <p className="hot100-home__kicker">1958–2024</p>
          <Link href="/hot100" className="hot100-home__title">
            Year-End Hot 100
          </Link>
        </div>
        <Hot100YearJump id="hot100-home-year" />
      </div>
    </section>
  );
}
