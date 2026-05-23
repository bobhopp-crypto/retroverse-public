/** Dev-only: visual hotspot calibration on the homepage poster. */
export const DEBUG_HOTSPOTS = false;

/** Artwork intrinsic size — drives poster-frame aspect-ratio (1024×1536). */
export const POSTER_ART_WIDTH = 1024;
export const POSTER_ART_HEIGHT = 1536;

export type PosterRectPct = {
  top: string;
  left: string;
  width: string;
  height: string;
};

export type PosterRectNums = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function parsePosterRectPct(rect: PosterRectPct): PosterRectNums {
  return {
    top: parseFloat(rect.top),
    left: parseFloat(rect.left),
    width: parseFloat(rect.width),
    height: parseFloat(rect.height),
  };
}

export function posterRectPctFromNums(n: PosterRectNums): PosterRectPct {
  const pct = (v: number) => `${Math.round(v * 10) / 10}%`;
  return {
    top: pct(n.top),
    left: pct(n.left),
    width: pct(n.width),
    height: pct(n.height),
  };
}

export function posterRectPctStyle(rect: PosterRectPct) {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  } as const;
}

/** Paste into `HOME_SEARCH_ZONE` in this file after calibrating. */
export function formatSearchZoneExport(rect: PosterRectNums): string {
  const p = posterRectPctFromNums(rect);
  return `export const HOME_SEARCH_ZONE: PosterRectPct = {
  top: "${p.top}",
  left: "${p.left}",
  width: "${p.width}",
  height: "${p.height}",
};`;
}

/** Cream search pill — calibrated on retroverse-home.png */
export const HOME_SEARCH_ZONE: PosterRectPct = {
  top: "39.3%",
  left: "24.9%",
  width: "55.9%",
  height: "4.5%",
};

/** All % values are relative to .poster-frame (same box as the artwork). */
export const HOME_LINK_HOTSPOTS = {
  charts: {
    top: "51%",
    left: "45%",
    width: "34%",
    height: "5.5%",
  },
  albums: {
    top: "76%",
    left: "45%",
    width: "38%",
    height: "5.5%",
  },
  feedback: {
    top: "82.5%",
    left: "5%",
    width: "90%",
    height: "13%",
  },
} as const satisfies Record<string, PosterRectPct>;
