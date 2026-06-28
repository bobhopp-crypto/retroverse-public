import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import sharp from "sharp";

import { collectorVisualAssetsDir } from "./paths";
import { defaultPerformanceId, derivePerformances } from "./package-archive";
import type { CollectorPackage } from "./types";
import type {
  CollectorVisualIdentityPackage,
  PerformanceVisualIdentity,
  VisualBrightness,
  VisualContrast,
  VisualIdentityProfile,
  VisualLightingStyle,
} from "./visual-identity-types";
import { VISUAL_IDENTITY_VERSION } from "./visual-identity-types";

type Rgb = { r: number; g: number; b: number };

type ImageMetrics = {
  pixels: Rgb[];
  meanLuminance: number;
  luminanceStdev: number;
  meanSaturation: number;
  hueSpread: number;
  colorVariance: number;
  sharpness: number;
};

const JPG_PATTERN = /^[a-z0-9-]+\.jpg$/i;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
        break;
    }
  }

  return { h, s, l };
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function pickCentroids(pixels: Rgb[], k: number): Rgb[] {
  if (pixels.length === 0) return [];
  const step = Math.max(1, Math.floor(pixels.length / k));
  const centroids: Rgb[] = [];
  for (let i = 0; i < k && i * step < pixels.length; i++) {
    centroids.push({ ...pixels[i * step]! });
  }
  while (centroids.length < k && centroids.length < pixels.length) {
    centroids.push({ ...pixels[centroids.length]! });
  }
  return centroids;
}

function kMeans(pixels: Rgb[], k: number, iterations = 8): Array<{ color: Rgb; weight: number }> {
  if (pixels.length === 0) return [];
  const count = Math.min(k, pixels.length);
  let centroids = pickCentroids(pixels, count);

  for (let iter = 0; iter < iterations; iter++) {
    const buckets: Rgb[][] = Array.from({ length: centroids.length }, () => []);
    for (const pixel of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(pixel, centroids[i]!);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      buckets[best]!.push(pixel);
    }

    centroids = centroids.map((centroid, i) => {
      const bucket = buckets[i]!;
      if (bucket.length === 0) return centroid;
      const sum = bucket.reduce(
        (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
        { r: 0, g: 0, b: 0 },
      );
      return {
        r: sum.r / bucket.length,
        g: sum.g / bucket.length,
        b: sum.b / bucket.length,
      };
    });
  }

  const weights = new Array(centroids.length).fill(0);
  for (const pixel of pixels) {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < centroids.length; i++) {
      const dist = colorDistance(pixel, centroids[i]!);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    weights[best]! += 1;
  }

  return centroids
    .map((color, i) => ({ color, weight: weights[i]! }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

async function analyzeImage(imagePath: string): Promise<ImageMetrics | null> {
  try {
    const [raw, stats] = await Promise.all([
      sharp(imagePath).resize(48, 48, { fit: "fill" }).raw().toBuffer(),
      sharp(imagePath).stats(),
    ]);

    const pixels: Rgb[] = [];
    for (let i = 0; i < raw.length; i += 3) {
      pixels.push({ r: raw[i]!, g: raw[i + 1]!, b: raw[i + 2]! });
    }

    if (pixels.length === 0) return null;

    const luminances = pixels.map(luminance);
    const meanLuminance = luminances.reduce((s, v) => s + v, 0) / luminances.length;
    const lumVar =
      luminances.reduce((s, v) => s + (v - meanLuminance) ** 2, 0) / luminances.length;
    const luminanceStdev = Math.sqrt(lumVar);

    const hsl = pixels.map(rgbToHsl);
    const meanSaturation = hsl.reduce((s, v) => s + v.s, 0) / hsl.length;
    const hues = hsl.filter((v) => v.s > 0.12).map((v) => v.h);
    let hueSpread = 0;
    if (hues.length > 1) {
      const meanHue = hues.reduce((s, v) => s + v, 0) / hues.length;
      hueSpread = Math.sqrt(
        hues.reduce((s, v) => s + (v - meanHue) ** 2, 0) / hues.length,
      );
    }

    const mean = {
      r: pixels.reduce((s, p) => s + p.r, 0) / pixels.length,
      g: pixels.reduce((s, p) => s + p.g, 0) / pixels.length,
      b: pixels.reduce((s, p) => s + p.b, 0) / pixels.length,
    };
    const colorVariance =
      pixels.reduce((s, p) => s + colorDistance(p, mean) ** 2, 0) / pixels.length;

    const channel = stats.channels[0];
    const sharpness = channel?.stdev ?? 0;

    return {
      pixels,
      meanLuminance,
      luminanceStdev,
      meanSaturation,
      hueSpread,
      colorVariance,
      sharpness,
    };
  } catch {
    return null;
  }
}

function classifyBrightness(meanLuminance: number): VisualBrightness {
  if (meanLuminance < 70) return "dark";
  if (meanLuminance < 150) return "medium";
  return "bright";
}

function classifyContrast(luminanceStdev: number): VisualContrast {
  if (luminanceStdev < 28) return "low";
  if (luminanceStdev < 55) return "medium";
  return "high";
}

function classifyLighting(
  palette: Rgb[],
  meanSaturation: number,
  hueSpread: number,
  brightness: VisualBrightness,
): VisualLightingStyle {
  const dominant = palette[0] ?? { r: 128, g: 128, b: 128 };
  const domHsl = rgbToHsl(dominant);
  const warmShare =
    palette.filter((c) => {
      const h = rgbToHsl(c).h;
      return h <= 55 || h >= 330;
    }).length / Math.max(palette.length, 1);

  if (meanSaturation < 0.12 && brightness !== "bright") return "monochrome";
  if (meanSaturation < 0.15 && brightness === "bright") return "studio_clean";
  if (hueSpread > 85 && meanSaturation > 0.45) return "psychedelic";
  if (warmShare >= 0.5 && domHsl.l < 0.65) return "warm_stage";
  if (warmShare >= 0.4 && domHsl.h >= 15 && domHsl.h <= 45) return "sunset";
  if (domHsl.h >= 185 && domHsl.h <= 250 && brightness !== "bright") return "concert_blue";
  if (meanSaturation > 0.55 && brightness !== "dark") return "neon";
  if (meanSaturation < 0.28 && brightness === "medium") return "television";
  if (domHsl.h >= 185 && domHsl.h <= 250) return "concert_blue";
  return "television";
}

function classifyEnergy(contrast: VisualContrast, colorVariance: number, sharpness: number): string {
  const score =
    (contrast === "high" ? 2 : contrast === "medium" ? 1 : 0) +
    (colorVariance > 1800 ? 2 : colorVariance > 900 ? 1 : 0) +
    (sharpness > 45 ? 1 : 0);
  if (score >= 4) return "dynamic";
  if (score >= 3) return "steady";
  if (score >= 2) return "slow_build";
  return "still";
}

function classifyTexture(luminanceStdev: number, colorVariance: number): string {
  if (luminanceStdev > 50 && colorVariance > 1200) return "soft_smoke";
  if (luminanceStdev > 38) return "grain";
  if (colorVariance < 800) return "smooth";
  return "crisp";
}

function classifyAtmosphere(lighting: VisualLightingStyle, brightness: VisualBrightness): string {
  switch (lighting) {
    case "concert_blue":
      return brightness === "dark" ? "stage_smoke" : "spotlight";
    case "warm_stage":
      return "live_house";
    case "neon":
      return "club_glow";
    case "sunset":
      return "golden_hour";
    case "studio_clean":
      return "controlled_studio";
    case "television":
      return "broadcast_stage";
    case "psychedelic":
      return "color_wash";
    case "monochrome":
      return "minimal_void";
    default:
      return "neutral_stage";
  }
}

function classifyCameraEnergy(sharpnessValues: number[], contrast: VisualContrast): string {
  const avgSharp = sharpnessValues.reduce((s, v) => s + v, 0) / Math.max(sharpnessValues.length, 1);
  const spread =
    sharpnessValues.length > 1
      ? Math.max(...sharpnessValues) - Math.min(...sharpnessValues)
      : 0;
  if (avgSharp > 50 || spread > 18) return "kinetic";
  if (contrast === "high" || avgSharp > 35) return "moderate";
  return "static";
}

function classifyMood(
  brightness: VisualBrightness,
  lighting: VisualLightingStyle,
  contrast: VisualContrast,
): { mood: string; emotionalTone: string } {
  if (lighting === "monochrome" && brightness === "dark") {
    return { mood: "brooding", emotionalTone: "intense" };
  }
  if (lighting === "sunset" || lighting === "warm_stage") {
    return { mood: "nostalgic", emotionalTone: "warm" };
  }
  if (lighting === "neon" || lighting === "psychedelic") {
    return { mood: "euphoric", emotionalTone: "playful" };
  }
  if (lighting === "concert_blue" && contrast === "high") {
    return { mood: "dramatic", emotionalTone: "cinematic" };
  }
  if (lighting === "studio_clean") {
    return { mood: "polished", emotionalTone: "assured" };
  }
  if (brightness === "dark") {
    return { mood: "dramatic", emotionalTone: "contemplative" };
  }
  return { mood: "reflective", emotionalTone: "steady" };
}

function classifyTypography(lighting: VisualLightingStyle, mood: string): string {
  if (lighting === "concert_blue" || mood === "dramatic") return "cinematic";
  if (lighting === "neon" || lighting === "psychedelic") return "bold";
  if (lighting === "studio_clean") return "minimal";
  if (lighting === "sunset" || lighting === "warm_stage") return "editorial";
  if (lighting === "television") return "retro";
  return "editorial";
}

function pickAccentColor(palette: Rgb[], primary: Rgb, secondary: Rgb): Rgb {
  let best: Rgb = secondary;
  let bestSat = -1;
  for (const color of palette) {
    if (colorDistance(color, primary) < 30) continue;
    const sat = rgbToHsl(color).s;
    if (sat > bestSat) {
      bestSat = sat;
      best = color;
    }
  }
  return best;
}

function roundConfidence(value: number): number {
  return Math.round(clamp(value, 0, 0.98) * 100) / 100;
}

function buildProfile(
  clusters: Array<{ color: Rgb; weight: number }>,
  metrics: ImageMetrics[],
  imageCount: number,
): VisualIdentityProfile {
  const palette = clusters.slice(0, 8).map((c) => rgbToHex(c.color));
  const primary = clusters[0]?.color ?? { r: 128, g: 128, b: 128 };
  const secondary = clusters[1]?.color ?? primary;
  const accent = pickAccentColor(
    clusters.map((c) => c.color),
    primary,
    secondary,
  );

  const meanLuminance =
    metrics.reduce((s, m) => s + m.meanLuminance, 0) / Math.max(metrics.length, 1);
  const luminanceStdev =
    metrics.reduce((s, m) => s + m.luminanceStdev, 0) / Math.max(metrics.length, 1);
  const meanSaturation =
    metrics.reduce((s, m) => s + m.meanSaturation, 0) / Math.max(metrics.length, 1);
  const hueSpread =
    metrics.reduce((s, m) => s + m.hueSpread, 0) / Math.max(metrics.length, 1);
  const colorVariance =
    metrics.reduce((s, m) => s + m.colorVariance, 0) / Math.max(metrics.length, 1);
  const sharpnessValues = metrics.map((m) => m.sharpness);

  const brightness = classifyBrightness(meanLuminance);
  const contrast = classifyContrast(luminanceStdev);
  const lighting = classifyLighting(clusters.map((c) => c.color), meanSaturation, hueSpread, brightness);
  const energy = classifyEnergy(contrast, colorVariance, Math.max(...sharpnessValues, 0));
  const texture = classifyTexture(luminanceStdev, colorVariance);
  const atmosphere = classifyAtmosphere(lighting, brightness);
  const cameraEnergy = classifyCameraEnergy(sharpnessValues, contrast);
  const { mood, emotionalTone } = classifyMood(brightness, lighting, contrast);
  const typography = classifyTypography(lighting, mood);

  const confidence = roundConfidence(
    0.45 +
      Math.min(imageCount, 5) * 0.08 +
      (contrast !== "low" ? 0.08 : 0) +
      (palette.length >= 5 ? 0.1 : palette.length >= 3 ? 0.05 : 0) +
      (meanSaturation > 0.08 ? 0.05 : 0),
  );

  return {
    primaryColor: rgbToHex(primary),
    secondaryColor: rgbToHex(secondary),
    accentColor: rgbToHex(accent),
    palette,
    mood,
    lighting,
    energy,
    texture,
    typography,
    brightness,
    contrast,
    atmosphere,
    cameraEnergy,
    emotionalTone,
    confidence,
  };
}

export async function listPerformanceImagePaths(rvtr: string): Promise<string[]> {
  const dir = collectorVisualAssetsDir(rvtr.trim().toUpperCase());
  if (!existsSync(dir)) return [];

  const files = await readdir(dir);
  return files
    .filter((file) => JPG_PATTERN.test(file))
    .sort()
    .map((file) => join(dir, file));
}

export async function extractVisualIdentityFromImages(
  imagePaths: string[],
): Promise<VisualIdentityProfile | null> {
  const existing = imagePaths.filter((p) => existsSync(p));
  if (existing.length === 0) return null;

  const metrics: ImageMetrics[] = [];
  for (const path of existing) {
    const analyzed = await analyzeImage(path);
    if (analyzed) metrics.push(analyzed);
  }

  if (metrics.length === 0) return null;

  const allPixels = metrics.flatMap((m) => m.pixels);
  const clusters = kMeans(allPixels, 8);
  if (clusters.length === 0) return null;

  return buildProfile(clusters, metrics, existing.length);
}

export async function buildPerformanceVisualIdentity(input: {
  performanceId: string;
  title: string;
  imagePaths: string[];
}): Promise<PerformanceVisualIdentity> {
  const sourceImages = input.imagePaths.map((p) => p.split("/").pop() ?? p);
  const profile = await extractVisualIdentityFromImages(input.imagePaths);

  if (!profile) {
    return {
      performanceId: input.performanceId,
      title: input.title,
      sourceImages,
      skipped: true,
      skipReason: "No performance imagery available for analysis",
      profile: null,
    };
  }

  return {
    performanceId: input.performanceId,
    title: input.title,
    sourceImages,
    skipped: false,
    skipReason: null,
    profile,
  };
}

/** Build visual identity package from a finalized Collector package. */
export async function buildVisualIdentityPackage(
  pkg: CollectorPackage,
): Promise<CollectorVisualIdentityPackage> {
  const performances = derivePerformances(pkg);
  const primaryId = defaultPerformanceId(performances);
  const primaryImages = await listPerformanceImagePaths(pkg.rvtr);

  const entries: PerformanceVisualIdentity[] = [];

  for (const perf of performances) {
    const isPrimary = perf.id === primaryId;
    const imagePaths = isPrimary ? primaryImages : [];
    entries.push(
      await buildPerformanceVisualIdentity({
        performanceId: perf.id,
        title: perf.title,
        imagePaths,
      }),
    );
  }

  const primaryEntry =
    entries.find((e) => e.performanceId === primaryId && e.profile) ??
    entries.find((e) => e.profile) ??
    null;

  return {
    version: VISUAL_IDENTITY_VERSION,
    rvtr: pkg.rvtr.trim().toUpperCase(),
    artist: pkg.artist,
    title: pkg.title,
    generatedAt: new Date().toISOString(),
    primaryPerformanceId: primaryId,
    profile: primaryEntry?.profile ?? null,
    performances: entries,
  };
}
