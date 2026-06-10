/**
 * Verify Creative Lab Phase 7 — illustration composition system.
 * Usage: npx tsx tools/creative-lab/illustration-capture.ts
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { chromium } from "playwright";

import { catalogStats } from "../../lib/ops/creative-lab/illustration/catalog";

const BASE = process.env.CL_CAPTURE_BASE ?? "http://localhost:3001";
const OUT = join(process.cwd(), "reports/creative-lab");

async function fillDeskAndGenerate(page: import("playwright").Page) {
  await page.locator(".cl-desk__output-btn:has-text('PASS')").click();
  await page.fill('.cl-desk__field:has-text("Venue") input', "The Main Pub");
  await page.fill('.cl-desk__field:has-text("Date") input', "June 14, 2026");
  await page.locator('.cl-preset-ws:has-text("Sunday Nights Classic")').click();
  await page.locator('.cl-desk__artifact-btn:has-text("VIP PASS")').click();
  await page.locator('button:has-text("GENERATE CONCEPTS")').click();
  await page.waitForSelector(".cl-composed-board", { timeout: 45000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const findings: string[] = [];
  const stats = catalogStats();

  findings.push(`library_total_assets: ${stats.total >= 100 ? "PASS" : "FAIL"} (${stats.total})`);
  findings.push(`psychedelic_assets: ${stats["psychedelic-festival"] >= 25 ? "PASS" : "FAIL"} (${stats["psychedelic-festival"]})`);
  findings.push(`cartoon_assets: ${stats["saturday-morning-cartoon"] >= 25 ? "PASS" : "FAIL"} (${stats["saturday-morning-cartoon"]})`);
  findings.push(`television_assets: ${stats["vintage-television"] >= 25 ? "PASS" : "FAIL"} (${stats["vintage-television"]})`);
  findings.push(`collector_assets: ${stats["collector-memorabilia"] >= 25 ? "PASS" : "FAIL"} (${stats["collector-memorabilia"]})`);

  const before = join(OUT, "art-direction-round1.png");
  if (existsSync(before)) {
    copyFileSync(before, join(OUT, "illustration-before-phase6.png"));
    findings.push("before_snapshot: PASS");
  } else {
    findings.push("before_snapshot: SKIP (no phase6 screenshot)");
  }

  const browser = await chromium.launch({ channel: "chrome" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.context().addCookies([
    { name: "retroverse_ops_gate", value: "ok", domain: "localhost", path: "/" },
  ]);

  await page.goto(`${BASE}/ops/creative-lab`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector(".cl-desk", { timeout: 60000 });
  await fillDeskAndGenerate(page);
  await page.waitForTimeout(600);

  const composed = await page.locator(".cl-composed-board").count();
  findings.push(`composed_boards: ${composed >= 4 ? "PASS" : "FAIL"} (${composed})`);

  await page.screenshot({ path: join(OUT, "illustration-after-round1.png"), fullPage: true });

  const cards = await page.locator(".cl-art-card").count();
  findings.push(`four_concept_cards: ${cards === 4 ? "PASS" : "FAIL"} (${cards})`);

  await browser.close();

  writeFileSync(join(OUT, "illustration-findings.txt"), findings.join("\n") + "\n");
  writeFileSync(
    join(OUT, "illustration-verification.md"),
    `# Creative Lab Phase 7 — Retroverse Illustration System

## Library stats

| Category | Assets |
|----------|--------|
| Psychedelic Festival | ${stats["psychedelic-festival"]} |
| Saturday Morning Cartoon | ${stats["saturday-morning-cartoon"]} |
| Vintage Television | ${stats["vintage-television"]} |
| Collector Memorabilia | ${stats["collector-memorabilia"]} |
| **Total** | **${stats.total}** |

## Composition layers

background → decorations → centerpiece → accents → numbering → frame → event strip (5%)

## Screenshots

- Before (Phase 6): \`illustration-before-phase6.png\`
- After (Phase 7): \`illustration-after-round1.png\`

## Quality tests

1. Category identifiable from 10 feet — visual inspection of after screenshot
2. Laminate-worthy collectible feel — layered library composition vs hardcoded SVG

## Findings

\`\`\`
${findings.join("\n")}
\`\`\`
`,
  );

  console.log(findings.join("\n"));
  if (findings.some((f) => f.includes("FAIL"))) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
