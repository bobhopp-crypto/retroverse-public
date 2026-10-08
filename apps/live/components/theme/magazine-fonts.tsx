import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--rv-font-display",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
  variable: "--rv-font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--rv-font-sans",
  display: "swap",
});

/** Shared type for the magazine system. Other routes can add this class later. */
export const magazineFontClass = `${display.variable} ${serif.variable} ${sans.variable}`;
