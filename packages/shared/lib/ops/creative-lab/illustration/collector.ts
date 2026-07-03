import {
  archivalCorner,
  collectibleBadge,
  editionMarker,
  embossStamp,
  foilSeal,
  handStar,
  numberingPlate,
  collectorRibbon,
  ticketPerforation,
} from "./generators";
import type { IllustrationAsset } from "./types";

const BACKGROUNDS: IllustrationAsset[] = [
  {
    id: "col-bg-linen",
    name: "Archival linen",
    category: "collector-memorabilia",
    layer: "background",
    tags: ["linen", "paper"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c3}}"/>
      ${Array.from({ length: 50 }, (_, i) => `<line x1="${(i * 17) % 400}" y1="0" x2="${(i * 17) % 400}" y2="560" stroke="{{c1}}" opacity="0.04"/>`).join("")}`,
  },
  {
    id: "col-bg-card-stock",
    name: "Card stock",
    category: "collector-memorabilia",
    layer: "background",
    tags: ["card", "stock"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c5}}"/>
      <rect x="30" y="30" width="340" height="500" fill="{{c3}}" opacity="0.35" rx="4"/>`,
  },
];

const COL_FRAMES: IllustrationAsset[] = [
  {
    id: "col-frame-trading",
    name: "Trading card frame",
    category: "collector-memorabilia",
    layer: "frame",
    tags: ["trading-card", "frame"],
    viewBox: "0 0 400 560",
    content: `<rect x="20" y="20" width="360" height="520" fill="none" stroke="{{c5}}" stroke-width="6"/>
      <rect x="32" y="32" width="336" height="496" fill="none" stroke="{{c4}}" stroke-width="2"/>`,
  },
  {
    id: "col-frame-ticket",
    name: "Ticket stock frame",
    category: "collector-memorabilia",
    layer: "frame",
    tags: ["ticket", "frame"],
    viewBox: "0 0 400 560",
    content: `<rect x="24" y="40" width="352" height="480" fill="{{c3}}" stroke="{{c4}}" stroke-width="3" rx="2"/>
      <line x1="24" y1="200" x2="376" y2="200" stroke="{{c4}}" stroke-width="1" stroke-dasharray="8 6"/>`,
  },
];

export const COLLECTOR_ASSETS: IllustrationAsset[] = [
  ...BACKGROUNDS,
  ...COL_FRAMES,
  ...Array.from({ length: 4 }, (_, i) => foilSeal(`col-foil-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => collectorRibbon(`col-ribbon-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => numberingPlate(`col-number-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => ticketPerforation(`col-perf-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => archivalCorner(`col-corner-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => embossStamp(`col-emboss-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => collectibleBadge(`col-badge-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => editionMarker(`col-edition-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => handStar(`col-star-${i + 1}`, "collector-memorabilia", i, "accent")),
];
