export const DEFAULT_MAGAZINE_ACCENT = "#c33e2f";

type Rgb = { r: number; g: number; b: number };

function rgbToHsl({ r, g, b }: Rgb): [number, number, number] {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = max === red ? (green - blue) / delta + (green < blue ? 6 : 0) : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return [hue * 60, saturation, lightness];
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const [r, g, b] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return `#${[r, g, b].map((value) => Math.round((value + match) * 255).toString(16).padStart(2, "0")).join("")}`;
}

export function extractMagazineAccent(data: ImageData | null | undefined): string {
  if (!data?.data?.length) return DEFAULT_MAGAZINE_ACCENT;
  let hueX = 0, hueY = 0, total = 0;
  for (let i = 0; i < data.data.length; i += 4) {
    const rgb = { r: data.data[i]!, g: data.data[i + 1]!, b: data.data[i + 2]! };
    const [hue, saturation, lightness] = rgbToHsl(rgb);
    if (lightness < 0.12 || lightness > 0.94 || saturation < 0.18) continue;
    hueX += Math.cos((hue * Math.PI) / 180) * saturation;
    hueY += Math.sin((hue * Math.PI) / 180) * saturation;
    total += saturation;
  }
  if (total === 0) return DEFAULT_MAGAZINE_ACCENT;
  const hue = (Math.atan2(hueY, hueX) * 180) / Math.PI;
  return hslToHex((hue + 360) % 360, 0.56, 0.42);
}
