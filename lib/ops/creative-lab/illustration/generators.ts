import type { ArtDirectionId } from "../art-directions";
import type { IllustrationAsset, IllustrationLayer } from "./types";

function asset(
  id: string,
  name: string,
  category: ArtDirectionId,
  layer: IllustrationLayer,
  tags: string[],
  viewBox: string,
  content: string,
): IllustrationAsset {
  return { id, name, category, layer, tags, viewBox, content };
}

/** Hand-drawn star with n points, seed shifts inner radius */
export function handStar(id: string, category: ArtDirectionId, seed: number, layer: IllustrationLayer = "accent"): IllustrationAsset {
  const points = 5 + (seed % 3);
  const outer = 28;
  const inner = 10 + (seed % 6);
  const cx = 32;
  const cy = 32;
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI / points) * i - Math.PI / 2 + seed * 0.08;
    const r = i % 2 === 0 ? outer : inner;
    coords.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return asset(
    id,
    `Hand star ${seed}`,
    category,
    layer,
    ["star", "hand-drawn"],
    "0 0 64 64",
    `<polygon points="${coords.join(" ")}" fill="{{c2}}" stroke="{{c4}}" stroke-width="2"/>`,
  );
}

export function musicNote(id: string, category: ArtDirectionId, seed: number): IllustrationAsset {
  const tilt = seed * 12;
  return asset(
    id,
    `Musical note ${seed}`,
    category,
    "accent",
    ["music", "note"],
    "0 0 48 64",
    `<g transform="rotate(${tilt} 24 32)">
      <ellipse cx="14" cy="52" rx="10" ry="7" fill="{{c1}}" stroke="{{c4}}" stroke-width="2"/>
      <rect x="22" y="8" width="5" height="44" fill="{{c4}}"/>
      <path d="M27,8 Q40,14 38,28 Q36,40 27,36" fill="none" stroke="{{c4}}" stroke-width="4"/>
    </g>`,
  );
}

export function swirlFlourish(id: string, category: ArtDirectionId, seed: number): IllustrationAsset {
  const amp = 8 + seed * 2;
  return asset(
    id,
    `Decorative swirl ${seed}`,
    category,
    "decoration",
    ["swirl", "flourish"],
    "0 0 80 80",
    `<path d="M8,40 C8,20 ${amp + 10},8 40,8 S72,20 72,40 S56,72 40,72 S8,56 8,40" fill="none" stroke="{{c1}}" stroke-width="3"/>
     <path d="M20,40 C20,28 28,20 40,20 S60,28 60,40" fill="none" stroke="{{c2}}" stroke-width="2" opacity="0.7"/>
     <circle cx="40" cy="40" r="${4 + seed}" fill="{{c3}}"/>`,
  );
}

export function paisleyFlourish(id: string, seed: number): IllustrationAsset {
  const wobble = seed * 3;
  return asset(
    id,
    `Paisley flourish ${seed}`,
    "psychedelic-festival",
    "decoration",
    ["paisley", "flourish"],
    "0 0 72 96",
    `<path d="M36,4 C56,4 68,24 60,44 C52,64 36,88 20,72 C8,60 12,36 24,24 C30,18 36,8 36,4 Z" fill="{{c1}}" opacity="0.85"/>
     <path d="M36,16 C48,18 54,30 48,42 C42,54 36,68 28,58 C22,50 26,32 36,16 Z" fill="{{c2}}"/>
     <circle cx="${34 + wobble}" cy="38" r="5" fill="{{c4}}"/>
     <path d="M30,50 Q36,${58 + wobble} 42,50" fill="none" stroke="{{c4}}" stroke-width="2"/>`,
  );
}

export function flowerCorner(id: string, seed: number): IllustrationAsset {
  const petals = 6 + (seed % 3);
  let petalPaths = "";
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * Math.PI * 2;
    const px = 40 + Math.cos(a) * 22;
    const py = 40 + Math.sin(a) * 22;
    petalPaths += `<ellipse cx="${px}" cy="${py}" rx="12" ry="20" fill="{{c2}}" stroke="{{c1}}" stroke-width="1.5" transform="rotate(${(a * 180) / Math.PI} ${px} ${py})"/>`;
  }
  return asset(
    id,
    `Flower power corner ${seed}`,
    "psychedelic-festival",
    "decoration",
    ["flower", "corner", "flower-power"],
    "0 0 80 80",
    `${petalPaths}<circle cx="40" cy="40" r="10" fill="{{c3}}"/><circle cx="40" cy="40" r="4" fill="{{c4}}"/>`,
  );
}

export function peaceSymbol(id: string, seed: number, layer: IllustrationLayer = "centerpiece"): IllustrationAsset {
  const scale = 1 + seed * 0.05;
  return asset(
    id,
    `Peace symbol ${seed}`,
    "psychedelic-festival",
    layer,
    ["peace", "symbol"],
    "0 0 100 100",
    `<g transform="scale(${scale}) translate(0,0)">
      <circle cx="50" cy="50" r="44" fill="none" stroke="{{c4}}" stroke-width="5"/>
      <line x1="50" y1="10" x2="50" y2="90" stroke="{{c4}}" stroke-width="5"/>
      <line x1="50" y1="50" x2="18" y2="78" stroke="{{c4}}" stroke-width="5"/>
      <line x1="50" y1="50" x2="82" y2="78" stroke="{{c4}}" stroke-width="5"/>
    </g>`,
  );
}

export function sunburstRays(id: string, seed: number): IllustrationAsset {
  const rays = 12 + seed * 2;
  let lines = "";
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const c = i % 3 === 0 ? "{{c1}}" : i % 3 === 1 ? "{{c2}}" : "{{c3}}";
    lines += `<line x1="100" y1="100" x2="${100 + Math.cos(a) * 90}" y2="${100 + Math.sin(a) * 90}" stroke="${c}" stroke-width="${2 + (seed % 2)}" opacity="0.75"/>`;
  }
  return asset(
    id,
    `Sunburst ${seed}`,
    "psychedelic-festival",
    "centerpiece",
    ["sunburst", "rays"],
    "0 0 200 200",
    `<circle cx="100" cy="100" r="55" fill="{{c2}}" opacity="0.5"/>${lines}<circle cx="100" cy="100" r="35" fill="{{c1}}" opacity="0.65"/>`,
  );
}

export function psychedelicRibbon(id: string, seed: number): IllustrationAsset {
  const wave = 10 + seed * 4;
  return asset(
    id,
    `Psychedelic ribbon ${seed}`,
    "psychedelic-festival",
    "decoration",
    ["ribbon", "banner"],
    "0 0 200 48",
    `<path d="M0,24 C30,${24 - wave} 70,${24 + wave} 100,24 S170,${24 - wave} 200,24 L200,36 C170,${36 + wave} 130,${36 - wave} 100,36 S30,${36 + wave} 0,36 Z" fill="{{c1}}" opacity="0.8"/>
     <path d="M0,28 C30,${28 - wave / 2} 70,${28 + wave / 2} 100,28 S170,${28 - wave / 2} 200,28" fill="none" stroke="{{c3}}" stroke-width="2"/>`,
  );
}

export function ornamentalBorder(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Ornamental border ${seed}`,
    "psychedelic-festival",
    "frame",
    ["border", "ornamental"],
    "0 0 400 560",
    `<rect x="12" y="12" width="376" height="536" fill="none" stroke="{{c1}}" stroke-width="${5 + seed}" rx="8"/>
     <rect x="22" y="22" width="356" height="516" fill="none" stroke="{{c2}}" stroke-width="2" rx="6"/>
     ${Array.from({ length: 8 + seed }, (_, i) => {
       const t = i / (8 + seed);
       const x = 22 + t * 356;
       return `<ellipse cx="${x}" cy="22" rx="8" ry="5" fill="{{c3}}" opacity="0.6"/>`;
     }).join("")}`,
  );
}

export function goofyEyes(id: string, seed: number): IllustrationAsset {
  const gap = 20 + seed * 2;
  return asset(
    id,
    `Goofy eyes ${seed}`,
    "saturday-morning-cartoon",
    "centerpiece",
    ["eyes", "goofy", "face"],
    "0 0 120 60",
    `<ellipse cx="${40 - gap / 4}" cy="28" rx="22" ry="26" fill="{{c5}}" stroke="{{c4}}" stroke-width="4"/>
     <ellipse cx="${80 + gap / 4}" cy="28" rx="22" ry="26" fill="{{c5}}" stroke="{{c4}}" stroke-width="4"/>
     <circle cx="${40 - gap / 4}" cy="${28 + seed}" r="8" fill="{{c4}}"/>
     <circle cx="${80 + gap / 4}" cy="${28 + seed}" r="8" fill="{{c4}}"/>
     <circle cx="${38 - gap / 4}" cy="${26 + seed}" r="3" fill="{{c5}}"/>
     <circle cx="${78 + gap / 4}" cy="${26 + seed}" r="3" fill="{{c5}}"/>`,
  );
}

export function smilingFace(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Smiling face ${seed}`,
    "saturday-morning-cartoon",
    "centerpiece",
    ["face", "smile", "character"],
    "0 0 100 100",
    `<circle cx="50" cy="50" r="44" fill="{{c1}}" stroke="{{c4}}" stroke-width="5"/>
     <circle cx="35" cy="42" r="6" fill="{{c4}}"/>
     <circle cx="65" cy="42" r="6" fill="{{c4}}"/>
     <path d="M30,${58 + seed} Q50,${78 + seed} 70,${58 + seed}" fill="none" stroke="{{c4}}" stroke-width="4" stroke-linecap="round"/>
     <ellipse cx="28" cy="55" rx="8" ry="5" fill="{{c3}}" opacity="0.5"/>
     <ellipse cx="72" cy="55" rx="8" ry="5" fill="{{c3}}" opacity="0.5"/>`,
  );
}

export function dancingRecord(id: string, seed: number): IllustrationAsset {
  const tilt = -15 + seed * 8;
  return asset(
    id,
    `Dancing record ${seed}`,
    "saturday-morning-cartoon",
    "accent",
    ["record", "vinyl", "dance"],
    "0 0 80 80",
    `<g transform="rotate(${tilt} 40 40)">
      <circle cx="40" cy="40" r="34" fill="{{c4}}" stroke="{{c4}}" stroke-width="4"/>
      <circle cx="40" cy="40" r="24" fill="none" stroke="{{c5}}" stroke-width="2"/>
      <circle cx="40" cy="40" r="8" fill="{{c1}}"/>
      <path d="M40,8 L44,20 L40,16 L36,20 Z" fill="{{c2}}"/>
    </g>`,
  );
}

export function cartoonMic(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Cartoon microphone ${seed}`,
    "saturday-morning-cartoon",
    "accent",
    ["microphone", "music"],
    "0 0 56 96",
    `<rect x="20" y="8" width="16" height="28" rx="8" fill="{{c2}}" stroke="{{c4}}" stroke-width="3"/>
     <path d="M12,36 Q28,${52 + seed} 44,36" fill="none" stroke="{{c4}}" stroke-width="4"/>
     <rect x="26" y="52" width="4" height="28" fill="{{c4}}"/>
     <rect x="16" y="78" width="24" height="8" rx="2" fill="{{c4}}"/>`,
  );
}

export function cartoonRocket(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Cartoon rocket ${seed}`,
    "saturday-morning-cartoon",
    "accent",
    ["rocket", "space"],
    "0 0 64 96",
    `<path d="M32,8 L44,48 L38,48 L42,80 L32,72 L22,80 L26,48 L20,48 Z" fill="{{c1}}" stroke="{{c4}}" stroke-width="3"/>
     <circle cx="32" cy="36" r="8" fill="{{c5}}" stroke="{{c4}}" stroke-width="2"/>
     <path d="M18,56 L8,72 L20,64 Z M46,56 L56,72 L44,64 Z" fill="{{c2}}" stroke="{{c4}}" stroke-width="2"/>`,
  );
}

export function cartoonTv(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Cartoon TV ${seed}`,
    "saturday-morning-cartoon",
    "decoration",
    ["tv", "television"],
    "0 0 96 80",
    `<rect x="8" y="16" width="80" height="56" rx="8" fill="{{c2}}" stroke="{{c4}}" stroke-width="4"/>
     <rect x="16" y="24" width="64" height="40" fill="{{c4}}"/>
     <rect x="36" y="72" width="24" height="6" fill="{{c4}}"/>
     <line x1="48" y1="8" x2="48" y2="16" stroke="{{c4}}" stroke-width="3"/>
     <circle cx="48" cy="6" r="4" fill="{{c1}}"/>`,
  );
}

export function speechBubble(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Speech bubble ${seed}`,
    "saturday-morning-cartoon",
    "decoration",
    ["speech", "bubble", "comic"],
    "0 0 120 80",
    `<rect x="8" y="8" width="${90 + seed}" height="48" rx="12" fill="{{c5}}" stroke="{{c4}}" stroke-width="4"/>
     <polygon points="24,56 16,72 40,56" fill="{{c5}}" stroke="{{c4}}" stroke-width="4"/>
     <text x="55" y="40" fill="{{c4}}" font-size="18" font-weight="900" text-anchor="middle">VIP!</text>`,
  );
}

export function cartoonFrame(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Cartoon frame ${seed}`,
    "saturday-morning-cartoon",
    "frame",
    ["frame", "cartoon"],
    "0 0 400 560",
    `<rect x="10" y="10" width="380" height="540" fill="{{c5}}" stroke="{{c4}}" stroke-width="${8 + seed}" rx="16"/>
     <rect x="24" y="24" width="352" height="512" fill="none" stroke="{{c1}}" stroke-width="4" rx="12"/>`,
  );
}

export function crtTelevision(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `CRT television ${seed}`,
    "vintage-television",
    "centerpiece",
    ["crt", "television", "tv"],
    "0 0 200 160",
    `<rect x="12" y="20" width="176" height="120" rx="10" fill="{{c5}}" stroke="{{c2}}" stroke-width="6"/>
     <rect x="24" y="32" width="152" height="96" fill="{{c4}}" rx="4"/>
     ${Array.from({ length: 6 }, (_, i) => `<line x1="24" y1="${40 + i * 14}" x2="176" y2="${40 + i * 14}" stroke="#fff" opacity="0.04"/>`).join("")}
     <rect x="80" y="140" width="40" height="12" fill="{{c2}}"/>
     <line x1="60" y1="8" x2="70" y2="20" stroke="{{c2}}" stroke-width="3"/>
     <line x1="140" y1="8" x2="130" y2="20" stroke="{{c2}}" stroke-width="3"/>`,
  );
}

export function rabbitEars(id: string, seed: number): IllustrationAsset {
  const spread = 20 + seed * 4;
  return asset(
    id,
    `Rabbit-ear antenna ${seed}`,
    "vintage-television",
    "accent",
    ["antenna", "rabbit-ear"],
    "0 0 120 80",
    `<line x1="60" y1="70" x2="${60 - spread}" y2="10" stroke="{{c2}}" stroke-width="4"/>
     <line x1="60" y1="70" x2="${60 + spread}" y2="10" stroke="{{c2}}" stroke-width="4"/>
     <circle cx="${60 - spread}" cy="10" r="5" fill="{{c3}}"/>
     <circle cx="${60 + spread}" cy="10" r="5" fill="{{c3}}"/>
     <rect x="48" y="68" width="24" height="8" fill="{{c2}}"/>`,
  );
}

export function stageCurtain(id: string, seed: number): IllustrationAsset {
  let folds = "";
  for (let i = 0; i < 6 + seed; i++) {
    const x = i * (200 / (6 + seed));
    folds += `<path d="M${x},0 Q${x + 15},80 ${x},160" fill="{{c3}}" opacity="0.85"/>`;
  }
  return asset(
    id,
    `Stage curtain ${seed}`,
    "vintage-television",
    "background",
    ["curtain", "stage"],
    "0 0 200 160",
    `${folds}<rect x="0" y="150" width="200" height="10" fill="{{c2}}"/>`,
  );
}

export function onAirLight(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `ON AIR light ${seed}`,
    "vintage-television",
    "accent",
    ["on-air", "broadcast", "light"],
    "0 0 100 40",
    `<rect x="4" y="4" width="92" height="32" rx="6" fill="{{c4}}" stroke="{{c2}}" stroke-width="2"/>
     <circle cx="22" cy="20" r="${8 + seed}" fill="#ff2222"/>
     <text x="58" y="24" fill="{{c5}}" font-size="12" font-weight="900" text-anchor="middle">ON AIR</text>`,
  );
}

export function studioBadge(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Studio badge ${seed}`,
    "vintage-television",
    "decoration",
    ["badge", "studio"],
    "0 0 80 80",
    `<circle cx="40" cy="40" r="36" fill="none" stroke="{{c2}}" stroke-width="4"/>
     <circle cx="40" cy="40" r="28" fill="{{c5}}" opacity="0.2"/>
     <text x="40" y="38" fill="{{c2}}" font-size="10" font-weight="900" text-anchor="middle">GUEST</text>
     <text x="40" y="52" fill="{{c2}}" font-size="8" text-anchor="middle">#${100 + seed}</text>`,
  );
}

export function broadcastSeal(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Broadcast seal ${seed}`,
    "vintage-television",
    "decoration",
    ["seal", "broadcast"],
    "0 0 96 96",
    `<circle cx="48" cy="48" r="42" fill="none" stroke="{{c2}}" stroke-width="3"/>
     <polygon points="48,12 56,36 82,36 62,52 70,76 48,60 26,76 34,52 14,36 40,36" fill="{{c2}}" opacity="0.35"/>
     <text x="48" y="52" fill="{{c5}}" font-size="9" font-weight="800" text-anchor="middle">LIVE TV</text>`,
  );
}

export function networkBug(id: string, seed: number): IllustrationAsset {
  const letters = ["RV", "SN", "TV", "MS"][seed % 4];
  return asset(
    id,
    `Network bug ${seed}`,
    "vintage-television",
    "accent",
    ["network", "bug", "logo"],
    "0 0 64 48",
    `<rect x="4" y="4" width="56" height="40" rx="4" fill="{{c2}}" opacity="0.9"/>
     <text x="32" y="30" fill="{{c4}}" font-size="16" font-weight="900" text-anchor="middle">${letters}</text>`,
  );
}

export function cameraSilhouette(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Camera silhouette ${seed}`,
    "vintage-television",
    "accent",
    ["camera", "silhouette"],
    "0 0 80 64",
    `<rect x="8" y="20" width="48" height="32" rx="6" fill="{{c4}}"/>
     <circle cx="52" cy="36" r="14" fill="{{c4}}"/>
     <circle cx="52" cy="36" r="8" fill="{{c5}}"/>
     <rect x="56" y="28" width="16" height="16" fill="{{c4}}"/>`,
  );
}

export function foilSeal(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Foil seal ${seed}`,
    "collector-memorabilia",
    "decoration",
    ["foil", "seal"],
    "0 0 72 72",
    `<circle cx="36" cy="36" r="32" fill="none" stroke="{{c5}}" stroke-width="4"/>
     <circle cx="36" cy="36" r="24" fill="{{c2}}" opacity="0.25"/>
     <polygon points="36,10 42,28 62,28 46,40 52,58 36,48 20,58 26,40 10,28 30,28" fill="{{c5}}" opacity="0.6"/>`,
  );
}

export function collectorRibbon(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Collector ribbon ${seed}`,
    "collector-memorabilia",
    "decoration",
    ["ribbon", "award"],
    "0 0 80 120",
    `<path d="M40,8 L52,48 L40,40 L28,48 Z" fill="{{c5}}"/>
     <rect x="30" y="40" width="20" height="60" fill="{{c1}}" stroke="{{c4}}" stroke-width="2"/>
     <path d="M30,100 L24,116 L40,104 L56,116 L50,100 Z" fill="{{c5}}"/>`,
  );
}

export function numberingPlate(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Numbering plate ${seed}`,
    "collector-memorabilia",
    "numbering",
    ["numbering", "plate", "edition"],
    "0 0 200 80",
    `<rect x="8" y="12" width="184" height="56" rx="4" fill="{{c5}}" stroke="{{c5}}" stroke-width="3"/>
     <rect x="14" y="18" width="172" height="44" fill="{{c3}}" stroke="{{c4}}" stroke-width="2"/>
     <text x="100" y="50" fill="{{c4}}" font-size="28" font-weight="900" text-anchor="middle">#${100 + seed}</text>`,
  );
}

export function ticketPerforation(id: string, seed: number): IllustrationAsset {
  let holes = "";
  for (let i = 0; i < 12 + seed; i++) {
    holes += `<circle cx="${8 + i * 14}" cy="20" r="4" fill="{{c5}}" stroke="{{c4}}"/>`;
  }
  return asset(
    id,
    `Ticket perforation ${seed}`,
    "collector-memorabilia",
    "frame",
    ["ticket", "perforation"],
    "0 0 200 40",
    holes,
  );
}

export function archivalCorner(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Archival corner ${seed}`,
    "collector-memorabilia",
    "decoration",
    ["archival", "corner"],
    "0 0 64 64",
    `<path d="M0,0 L48,0 L48,8 L8,8 L8,48 L0,48 Z" fill="{{c1}}" opacity="0.5"/>
     <path d="M0,0 L32,0 L0,32 Z" fill="{{c5}}" opacity="0.35"/>
     <text x="12" y="20" fill="{{c4}}" font-size="7" font-weight="800" transform="rotate(-45 12 20)">ARCHIVE</text>`,
  );
}

export function embossStamp(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Emboss stamp ${seed}`,
    "collector-memorabilia",
    "accent",
    ["emboss", "stamp"],
    "0 0 88 88",
    `<rect x="8" y="8" width="72" height="72" rx="6" fill="{{c3}}" stroke="{{c4}}" stroke-width="2"/>
     <text x="44" y="40" fill="{{c4}}" font-size="10" font-weight="900" text-anchor="middle" opacity="0.5">AUTHENTIC</text>
     <text x="44" y="56" fill="{{c5}}" font-size="14" font-weight="900" text-anchor="middle">★</text>`,
  );
}

export function collectibleBadge(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Collectible badge ${seed}`,
    "collector-memorabilia",
    "centerpiece",
    ["badge", "collectible"],
    "0 0 120 140",
    `<path d="M60,8 L100,32 L100,88 L60,132 L20,88 L20,32 Z" fill="{{c1}}" stroke="{{c5}}" stroke-width="4"/>
     <circle cx="60" cy="64" r="28" fill="{{c5}}" opacity="0.3"/>
     <text x="60" y="58" fill="{{c4}}" font-size="11" font-weight="900" text-anchor="middle">LIMITED</text>
     <text x="60" y="78" fill="{{c4}}" font-size="16" font-weight="900" text-anchor="middle">ED.</text>`,
  );
}

export function editionMarker(id: string, seed: number): IllustrationAsset {
  return asset(
    id,
    `Edition marker ${seed}`,
    "collector-memorabilia",
    "accent",
    ["edition", "marker"],
    "0 0 100 48",
    `<rect x="4" y="8" width="92" height="32" fill="{{c5}}" opacity="0.2" stroke="{{c5}}" stroke-width="2" rx="4"/>
     <text x="50" y="30" fill="{{c5}}" font-size="11" font-weight="800" text-anchor="middle">ED. ${seed + 1} OF 500</text>`,
  );
}
