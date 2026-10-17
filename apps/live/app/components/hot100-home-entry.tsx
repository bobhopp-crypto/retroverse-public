import Link from "next/link";
import { Oswald, Source_Serif_4 } from "next/font/google";

import { Hot100YearJump } from "../hot100/year-jump";

import "../hot100/hot100.css";

const gothic = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--hot100-gothic",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--hot100-serif",
  display: "swap",
});

export function Hot100HomeEntry() {
  return (
    <section className={`${gothic.variable} ${serif.variable} hot100-home`} aria-label="Year-End Hot 100">
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
