/** Static copy for the Live Aid Sunday event homepage — production values for this show. */

export const EVENT_HOMEPAGE_EVENT = {
  title: "Live Aid",
  date: "Sunday, June 29",
  venue: "The Main Pub",
  eventKey: "live-aid",
} as const;

/** Fallback hero when Event Control has no feature image yet. */
export const EVENT_HOMEPAGE_HERO_IMAGE =
  "https://pub-15869768b4464dd2ab5f02901a31569c.r2.dev/retroverse/covers/RVAL672719/RVAL672719__queen__greatest-hits-we-will-rock-you.jpg";

export const EVENT_HOMEPAGE_GIVEAWAY = {
  prizeTitle: "Queen Signed Memorabilia",
  prizeDescription:
    "Enter tonight's drawing for signed Queen collectibles — framed for display or ready for your shelf.",
  heroImageUrl: EVENT_HOMEPAGE_HERO_IMAGE,
  registerLabel: "Register to Win",
} as const;

export const EVENT_HOMEPAGE_FEATURED_YEARS = [1967, 1978, 1992] as const;

export const EVENT_HOMEPAGE_EDITORIAL = {
  eyebrow: "From the Living Music Archive",
  headline: "The Day the World Watched Together",
  paragraphs: [
    "On July 13, 1985, Wembley Stadium and JFK Stadium became the same stage. Bob Geldof and Midge Ure asked the impossible — link the world's biggest acts across continents for one cause — and for sixteen hours, music felt like a universal language.",
    "Forty percent of the planet tuned in. Queen played twenty-one minutes that still define stadium rock. U2 stretched one song until the crowd became part of the arrangement. Status Quo opened London with the riff that says the party has started.",
    "Tonight at The Main Pub, Retroverse revisits the years and performances that orbit that day — from Summer of Love psychedelia to MTV-era anthems and the grunge collision of the early nineties.",
  ],
} as const;

export type EventHomepageEditorialCopy = typeof EVENT_HOMEPAGE_EDITORIAL;

export const EVENT_HOMEPAGE_NEXT_EVENT = {
  title: "Woodstock",
  when: "August",
} as const;
