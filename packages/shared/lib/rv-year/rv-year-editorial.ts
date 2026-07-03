/** Editorial framing for RV Year worlds — magazine voice, not chart database copy. */

export type RvYearEditorial = {
  /** Strong headline under the year numeral, e.g. "Rock Gets Bigger". */
  headline: string;
  /** 2–3 sentence editorial summary. */
  lead: string;
};

const BY_YEAR: Partial<Record<number, RvYearEditorial>> = {
  1964: {
    headline: "The British Invasion Lands",
    lead: "Beatlemania rewires the radio. A year when the charts still felt like a national event — and the room got louder.",
  },
  1967: {
    headline: "Summer Turns Psychedelic",
    lead: "Color, rebellion, and studio ambition spill out of the speakers. Pop stops playing it safe and starts chasing the infinite.",
  },
  1971: {
    headline: "Rock Gets Bigger",
    lead: "Singer-songwriters, soul, and FM ambition share the spotlight. The albums grow longer, the feelings get louder, and every hit feels like a statement.",
  },
  1973: {
    headline: "Glitter Meets Grit",
    lead: "Arena rock rises while soul and funk keep the dance floor honest. Glam, grit, and groove trade the spotlight all year long.",
  },
  1976: {
    headline: "Disco Crosses Over",
    lead: "The mirror ball meets the tour bus. Fleetwood Mac owns the summer while dance music learns to speak to everyone.",
  },
  1977: {
    headline: "Saturday Night Fever",
    lead: "Four-on-the-floor energy takes the mainstream. Rock still packs arenas, but the pulse of the city gets faster.",
  },
  1978: {
    headline: "The Year Disco Took Over",
    lead: "Mirror balls, polyester, and unstoppable hooks. Pop and dance collide while rock answers from the stadium seats.",
  },
  1983: {
    headline: "Video Changes Everything",
    lead: "Image and sound lock together. Synths go mainstream and every big single feels like a broadcast premiere.",
  },
  1984: {
    headline: "Pop Turns Maximal",
    lead: "Big hooks, bigger hair, and anthems built for singalongs. The year when pop learned to fill every inch of the screen.",
  },
  1991: {
    headline: "Alternative Breaks Through",
    lead: "Grunge cracks the surface while hip-hop owns the conversation. The monoculture starts to splinter — but the hits still feel huge.",
  },
  1992: {
    headline: "Alternative Becomes Mainstream",
    lead: "Guitar bands return to the center of the culture. Hip-hop keeps evolving, and pop learns to borrow from every corner of the map.",
  },
  1999: {
    headline: "The Millennium Hums",
    lead: "Teen pop returns in force on the eve of a new century. Every smash still feels like shared memory before streaming rewrote the rules.",
  },
  2008: {
    headline: "Digital Singles Reshape the Climb",
    lead: "The download era accelerates how hits rise and fall. The velocity changes, but a great song still stops the room.",
  },
};

const BY_DECADE: Partial<Record<number, RvYearEditorial>> = {
  1950: {
    headline: "Postwar Optimism on the Dial",
    lead: "Early rock and roll and the last breath of the big-band era share the same airwaves.",
  },
  1960: {
    headline: "Youth Culture Finds Its Voice",
    lead: "British invasion, Motown, and folk-rock rewrite what a hit can sound like.",
  },
  1970: {
    headline: "Arena Rock and the Dance Floor",
    lead: "Stadium anthems and disco fever trade the spotlight all year long.",
  },
  1980: {
    headline: "MTV and the Blockbuster Single",
    lead: "Video-ready stars and drum-machine dreams compete for the center of culture.",
  },
  1990: {
    headline: "Genre Walls Come Down",
    lead: "Alternative, hip-hop, and pop collide in a faster cycle — but every smash still feels personal.",
  },
  2000: {
    headline: "The Download Era",
    lead: "Pop, R&B, and rock collide in a faster cycle — but every week still leaves a mark.",
  },
  2010: {
    headline: "Streaming Rewrites the Rules",
    lead: "Virality enters the vocabulary — yet month by month, the story stays human.",
  },
  2020: {
    headline: "A Fragmented Audience, Shared Moments",
    lead: "Every breakout still feels like opening a time capsule — one song at a time.",
  },
};

export function rvYearEditorial(year: number): RvYearEditorial {
  const exact = BY_YEAR[year];
  if (exact) return exact;

  const decade = Math.floor(year / 10) * 10;
  const decadeCopy = BY_DECADE[decade];
  if (decadeCopy) return decadeCopy;

  return {
    headline: "A Year in Popular Music",
    lead: `Move through the months and rediscover what people were playing, sharing, and arguing about in ${year}.`,
  };
}
