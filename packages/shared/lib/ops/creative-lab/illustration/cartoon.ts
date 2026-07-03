import {
  cartoonFrame,
  cartoonMic,
  cartoonRocket,
  cartoonTv,
  dancingRecord,
  goofyEyes,
  handStar,
  musicNote,
  smilingFace,
  speechBubble,
  swirlFlourish,
} from "./generators";
import type { IllustrationAsset } from "./types";

const BACKGROUNDS: IllustrationAsset[] = [
  {
    id: "toon-bg-sky",
    name: "Cartoon sky",
    category: "saturday-morning-cartoon",
    layer: "background",
    tags: ["sky", "halftone"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c2}}"/>
      ${Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 67) % 400}" cy="${(i * 41) % 560}" r="3" fill="{{c5}}" opacity="0.15"/>`).join("")}`,
  },
  {
    id: "toon-bg-burst",
    name: "Action burst background",
    category: "saturday-morning-cartoon",
    layer: "background",
    tags: ["burst", "action"],
    viewBox: "0 0 400 560",
    content: `<rect width="400" height="560" fill="{{c5}}"/>
      ${Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return `<line x1="200" y1="280" x2="${200 + Math.cos(a) * 280}" y2="${280 + Math.sin(a) * 280}" stroke="{{c2}}" stroke-width="8" opacity="0.12"/>`;
      }).join("")}`,
  },
];

export const CARTOON_ASSETS: IllustrationAsset[] = [
  ...BACKGROUNDS,
  ...Array.from({ length: 3 }, (_, i) => cartoonFrame(`toon-frame-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => goofyEyes(`toon-eyes-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => smilingFace(`toon-face-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => dancingRecord(`toon-record-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => cartoonMic(`toon-mic-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => cartoonRocket(`toon-rocket-${i + 1}`, i)),
  ...Array.from({ length: 3 }, (_, i) => cartoonTv(`toon-tv-${i + 1}`, i)),
  ...Array.from({ length: 5 }, (_, i) => musicNote(`toon-note-${i + 1}`, "saturday-morning-cartoon", i)),
  ...Array.from({ length: 4 }, (_, i) => speechBubble(`toon-bubble-${i + 1}`, i)),
  ...Array.from({ length: 4 }, (_, i) => handStar(`toon-star-${i + 1}`, "saturday-morning-cartoon", i + 2, "accent")),
  ...Array.from({ length: 3 }, (_, i) => swirlFlourish(`toon-swirl-${i + 1}`, "saturday-morning-cartoon", i)),
];
