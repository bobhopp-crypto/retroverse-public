/** Placeholder editorial framing for RV Year worlds — expand over time. */

export type RvYearEditorial = {
  tagline: string;
  lead: string;
};

const BY_YEAR: Partial<Record<number, RvYearEditorial>> = {
  1964: {
    tagline: "The British arrive. Beatlemania rewires the airwaves.",
    lead: "A year when the charts still felt like a national event — and the room got louder.",
  },
  1967: {
    tagline: "Summer of love. Psychedelia hits the Hot 100.",
    lead: "Color, rebellion, and studio ambition spill out of the speakers week by week.",
  },
  1973: {
    tagline: "Glitter and grit share the same chart run.",
    lead: "Arena rock rises while soul and funk keep the dance floor honest.",
  },
  1976: {
    tagline: "Disco crosses over. Fleetwood Mac dominates the summer.",
    lead: "The mirror ball meets the tour bus — a yearbook page where radio still ruled the room.",
  },
  1977: {
    tagline: "Saturday night fever. The pulse gets faster.",
    lead: "Four-on-the-floor energy climbs the Hot 100 while rock holds the line at the top.",
  },
  1983: {
    tagline: "MTV reshapes the spotlight. Synths go mainstream.",
    lead: "Image and sound lock together — every #1 week feels like a broadcast premiere.",
  },
  1984: {
    tagline: "Pop turns maximal. Every week wants an anthem.",
    lead: "Big hooks, bigger hair, and chart weeks that still echo in grocery-store aisles.",
  },
  1991: {
    tagline: "Grunge cracks the surface. Hip-hop owns the conversation.",
    lead: "The monoculture starts to splinter — but the #1 slot still tells the story.",
  },
  1999: {
    tagline: "The millennium hums. Teen pop returns in force.",
    lead: "A pre-streaming cliff edge — chart weeks still felt like shared memory.",
  },
  2008: {
    tagline: "Digital singles reshape the climb.",
    lead: "The Hot 100 learns new velocity — but the weekly ritual stays the same.",
  },
};

const BY_DECADE: Partial<Record<number, RvYearEditorial>> = {
  1950: {
    tagline: "Postwar optimism on the dial.",
    lead: "Early rock & roll and the last breath of the big-band era share the same chart paper.",
  },
  1960: {
    tagline: "Youth culture finds its voice.",
    lead: "British invasion, Motown, and folk-rock rewrite what a hit can sound like.",
  },
  1970: {
    tagline: "The rise of arena rock — and the disco countercurrent.",
    lead: "Stadium anthems and dance-floor fever trade the #1 spot all year long.",
  },
  1980: {
    tagline: "MTV, synth-pop, and blockbuster pop.",
    lead: "Video-ready stars and drum-machine dreams compete for the top of the chart.",
  },
  1990: {
    tagline: "Alternative breaks through. Hip-hop goes global.",
    lead: "Genre walls soften while the weekly #1 still crowns a cultural moment.",
  },
  2000: {
    tagline: "The download era accelerates the chart.",
    lead: "Pop, R&B, and rock collide in a faster cycle — but every week still leaves a mark.",
  },
  2010: {
    tagline: "Streaming reshapes the climb.",
    lead: "Virality enters the chart vocabulary — yet month-by-month, the story stays human.",
  },
  2020: {
    tagline: "A fragmented audience, a shared top spot.",
    lead: "Every #1 week still feels like opening a time capsule — one chart date at a time.",
  },
};

export function rvYearEditorial(year: number): RvYearEditorial {
  const exact = BY_YEAR[year];
  if (exact) return exact;

  const decade = Math.floor(year / 10) * 10;
  const decadeCopy = BY_DECADE[decade];
  if (decadeCopy) return decadeCopy;

  return {
    tagline: "A chart year in the Retroverse canon.",
    lead: "Move month by month — each week reveals who held #1 on the Hot 100 and Album 200.",
  };
}
