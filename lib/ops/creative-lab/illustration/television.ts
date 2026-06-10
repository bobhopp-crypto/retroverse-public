import {
  broadcastSeal,
  cameraSilhouette,
  crtTelevision,
  handStar,
  networkBug,
  onAirLight,
  rabbitEars,
  stageCurtain,
  studioBadge,
  swirlFlourish,
} from "./generators";
import type { IllustrationAsset } from "./types";

const BACKGROUNDS: IllustrationAsset[] = [
  {
    id: "tv-bg-studio",
    name: "Studio darkness",
    category: "vintage-television",
    layer: "background",
    tags: ["studio", "dark"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c4}}"/>
      <ellipse cx="200" cy="200" rx="180" ry="120" fill="{{c5}}" opacity="0.06"/>`,
  },
  {
    id: "tv-bg-scanlines",
    name: "CRT scanline field",
    category: "vintage-television",
    layer: "background",
    tags: ["scanlines", "crt"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c4}}"/>
      ${Array.from({ length: 28 }, (_, i) => `<line x1="0" y1="${i * 20}" x2="400" y2="${i * 20}" stroke="#fff" opacity="0.03"/>`).join("")}`,
  },
  {
    id: "tv-bg-curtain-full",
    name: "Full stage curtain",
    category: "vintage-television",
    layer: "background",
    tags: ["curtain", "stage"],
    viewBox: "0 0 400 560",
    content: `${Array.from({ length: 10 }, (_, i) => {
      const x = i * 40;
      return `<path d="M${x},0 Q${x + 20},280 ${x},560" fill="{{c3}}" opacity="0.75"/>`;
    }).join("")}<rect x="0" y="540" width="400" height="20" fill="{{c2}}"/>`,
  },
];

const TV_FRAMES: IllustrationAsset[] = [
  {
    id: "tv-frame-bezel",
    name: "TV bezel frame",
    category: "vintage-television",
    layer: "frame",
    tags: ["bezel", "frame"],
    viewBox: "0 0 400 560",
    content: `<rect x="16" y="16" width="368" height="528" fill="none" stroke="{{c2}}" stroke-width="8" rx="10"/>
      <rect x="28" y="28" width="344" height="504" fill="none" stroke="{{c5}}" stroke-width="2" opacity="0.4" rx="6"/>`,
  },
  {
    id: "tv-frame-gold",
    name: "Gold trim frame",
    category: "vintage-television",
    layer: "frame",
    tags: ["gold", "trim"],
    viewBox: "0 0 400 560",
    content: `<rect x="12" y="12" width="376" height="536" fill="none" stroke="{{c2}}" stroke-width="4"/>
      <rect x="20" y="20" width="360" height="520" fill="none" stroke="{{c2}}" stroke-width="12" opacity="0.25" rx="4"/>`,
  },
];

export const TELEVISION_ASSETS: IllustrationAsset[] = [
  ...BACKGROUNDS,
  ...TV_FRAMES,
  ...Array.from({ length: 4 }, (_, i) => crtTelevision(`tv-crt-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => rabbitEars(`tv-antenna-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => stageCurtain(`tv-curtain-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => onAirLight(`tv-onair-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => studioBadge(`tv-badge-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => broadcastSeal(`tv-seal-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => networkBug(`tv-bug-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => cameraSilhouette(`tv-camera-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => handStar(`tv-star-${i + 1}`, "vintage-television", i, "accent")),
  ...Array.from({ length: 2 }, (_, i) => swirlFlourish(`tv-swirl-${i + 1}`, "vintage-television", i)),
];
