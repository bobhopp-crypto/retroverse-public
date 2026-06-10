import {
  flowerCorner,
  handStar,
  numberingPlate,
  ornamentalBorder,
  paisleyFlourish,
  peaceSymbol,
  psychedelicRibbon,
  sunburstRays,
  swirlFlourish,
} from "./generators";
import type { IllustrationAsset } from "./types";

const BACKGROUNDS: IllustrationAsset[] = [
  {
    id: "psy-bg-paper",
    name: "Aged festival paper",
    category: "psychedelic-festival",
    layer: "background",
    tags: ["paper", "texture"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c5}}"/>
      <rect width="400" height="560" fill="{{c1}}" opacity="0.06"/>
      ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 560}" r="1.5" fill="{{c4}}" opacity="0.08"/>`).join("")}`,
  },
  {
    id: "psy-bg-radial",
    name: "Radial glow field",
    category: "psychedelic-festival",
    layer: "background",
    tags: ["radial", "glow"],
    viewBox: "0 0 400 560",
    content: `<defs><radialGradient id="psyGlow" cx="50%" cy="38%" r="65%"><stop offset="0%" stop-color="{{c2}}" stop-opacity="0.55"/><stop offset="100%" stop-color="{{c5}}" stop-opacity="1"/></radialGradient></defs>
      <rect width="400" height="560" fill="url(#psyGlow)"/>`,
  },
  {
    id: "psy-bg-bands",
    name: "Rainbow bands",
    category: "psychedelic-festival",
    layer: "background",
    tags: ["rainbow", "bands"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c5}}"/>
      ${["{{c1}}", "{{c2}}", "{{c3}}", "{{c1}}", "{{c2}}"].map((c, i) => `<rect x="0" y="${i * 112}" width="400" height="112" fill="${c}" opacity="0.12"/>`).join("")}`,
  },
];

export const PSYCHEDELIC_ASSETS: IllustrationAsset[] = [
  ...BACKGROUNDS,
  ...Array.from({ length: 3 }, (_, i) => ornamentalBorder(`psy-border-${i + 1}`, i)),
  ...Array.from({ length: 5 }, (_, i) => paisleyFlourish(`psy-paisley-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => flowerCorner(`psy-flower-corner-${i + 1}`, i)),
  ...Array.from({ length: 5 }, (_, i) => swirlFlourish(`psy-swirl-${i + 1}`, "psychedelic-festival", i)),
  ...Array.from({ length: 5 }, (_, i) => handStar(`psy-star-${i + 1}`, "psychedelic-festival", i)),
  ...Array.from({ length: 3 }, (_, i) => peaceSymbol(`psy-peace-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => sunburstRays(`psy-sunburst-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => psychedelicRibbon(`psy-ribbon-${i + 1}`, i)),
  ...Array.from({ length: 2 }, (_, i) => numberingPlate(`psy-number-${i + 1}`, i)),
];
