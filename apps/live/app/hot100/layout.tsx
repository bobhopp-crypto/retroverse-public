import type { ReactNode } from "react";
import { Oswald, Source_Serif_4 } from "next/font/google";

import "./hot100.css";

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

export default function Hot100Layout({ children }: { children: ReactNode }) {
  return <div className={`${gothic.variable} ${serif.variable} hot100-root`}>{children}</div>;
}
