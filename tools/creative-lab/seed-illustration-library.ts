/**
 * Write illustration library SVG files to RETROVERSE_DATA.
 * Usage: npx tsx tools/creative-lab/seed-illustration-library.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { applyPalette, paletteForDirection } from "../../lib/ops/creative-lab/illustration/colors";
import { catalogStats, ILLUSTRATION_BY_CATEGORY } from "../../lib/ops/creative-lab/illustration/catalog";
import { creativeLabIllustrationLibraryDir } from "../../lib/ops/creative-lab/paths";

const OUT = creativeLabIllustrationLibraryDir();

function writeAsset(category: string, id: string, viewBox: string, inner: string) {
  const dir = join(OUT, category);
  mkdirSync(dir, { recursive: true });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>\n`;
  writeFileSync(join(dir, `${id}.svg`), svg, "utf8");
}

function main() {
  mkdirSync(OUT, { recursive: true });
  const manifest: {
    version: 1;
    generatedAt: string;
    categories: Record<string, { count: number; assets: string[] }>;
    total: number;
  } = {
    version: 1,
    generatedAt: new Date().toISOString(),
    categories: {},
    total: 0,
  };

  for (const [category, assets] of Object.entries(ILLUSTRATION_BY_CATEGORY)) {
    const palette = paletteForDirection(category as keyof typeof ILLUSTRATION_BY_CATEGORY);
    const ids: string[] = [];
    for (const asset of assets) {
      const inner = applyPalette(asset.content, palette);
      writeAsset(category, asset.id, asset.viewBox, inner);
      ids.push(asset.id);
    }
    manifest.categories[category] = { count: assets.length, assets: ids };
    manifest.total += assets.length;
  }

  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const stats = catalogStats();
  console.log("Illustration library seeded:", OUT);
  console.log(JSON.stringify(stats, null, 2));
  console.log(`manifest total: ${manifest.total}`);
}

main();
