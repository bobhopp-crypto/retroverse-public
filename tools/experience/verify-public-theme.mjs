import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE ?? "https://retroverse.live";

const PAGES = [
  { id: "home", path: "/", name: "Home (Live)" },
  { id: "week", path: "/week/1986-05-10?focus=RVTR044043&rank=3", name: "Chart Week Explorer" },
  { id: "song", path: "/retroverse-2/song/RVTR569927", name: "Song" },
  { id: "artist", path: "/artist/fleetwood-mac", name: "Artist" },
  { id: "search", path: "/search?q=fleetwood", name: "Search" },
  { id: "year", path: "/rv/1976", name: "Year" },
];

const LEGACY_BLUE = [
  "rgb(6, 19, 38)",
  "rgb(6, 27, 57)",
  "rgb(13, 36, 80)",
  "rgb(44, 117, 255)",
  "rgb(31, 121, 255)",
  "rgb(87, 146, 255)",
];

const CANONICAL_PURPLE = "rgb(168, 85, 255)";
const CANONICAL_BG = "rgb(5, 8, 20)";

function rgbClose(a, b, tol = 12) {
  const pa = a.match(/\d+/g)?.map(Number) ?? [];
  const pb = b.match(/\d+/g)?.map(Number) ?? [];
  if (pa.length < 3 || pb.length < 3) return false;
  return pa.every((v, i) => Math.abs(v - pb[i]) <= tol);
}

async function sampleTheme(page) {
  const shell = page.locator(".rv2-live").first();
  const hasShell = (await shell.count()) > 0;
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const htmlBg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);

  let shellBg = null;
  if (hasShell) {
    shellBg = await shell.evaluate((el) => getComputedStyle(el).backgroundColor);
  }

  const legacyHits = [];
  const allEls = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      const props = [cs.backgroundColor, cs.borderTopColor, cs.color];
      for (const p of props) {
        if (p && p !== "rgba(0, 0, 0, 0)" && p !== "transparent") out.push(p);
      }
    }
    return out.slice(0, 4000);
  });

  for (const c of allEls) {
    for (const legacy of LEGACY_BLUE) {
      if (rgbClose(c, legacy)) legacyHits.push(c);
    }
  }

  const explorerRows = await page.locator(".explorer-row").count();
  const explorerBtns = await page.locator(".explorer-btn--play").count();
  const creamPaper = await page.locator(".artist-exhibit, .track-page, .sunday-nights").count();

  return {
    hasShell,
    bodyBg,
    htmlBg,
    shellBg,
    legacyHitCount: new Set(legacyHits).size,
    legacySamples: [...new Set(legacyHits)].slice(0, 5),
    explorerRows,
    explorerBtns,
    creamPaper,
    bgLooksCanonical: [bodyBg, htmlBg, shellBg].some((c) => c && rgbClose(c, CANONICAL_BG, 18)),
  };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
const results = [];

try {
  for (const route of PAGES) {
    const url = `${BASE}${route.path}`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(1500);
    const theme = await sampleTheme(page);
    const pass =
      theme.hasShell &&
      theme.bgLooksCanonical &&
      theme.legacyHitCount === 0 &&
      theme.creamPaper === 0;

    results.push({ ...route, url, theme, pass });
    console.log(`${pass ? "PASS" : "NEEDS ALIGNMENT"} — ${route.name}`);
    console.log(`  shell=${theme.hasShell} bgOk=${theme.bgLooksCanonical} legacy=${theme.legacyHitCount} cream=${theme.creamPaper}`);
    if (theme.legacySamples.length) console.log(`  legacy samples: ${theme.legacySamples.join(", ")}`);
  }
} finally {
  await browser.close();
}

const report = results.map((r) => ({
  route: r.path,
  name: r.name,
  url: r.url,
  status: r.pass ? "PASS" : "NEEDS ALIGNMENT",
  notes: r.pass
    ? "Broadcast shell, canonical dark background, no legacy blue samples detected."
    : [
        !r.theme.hasShell ? "Missing .rv2-live shell." : null,
        !r.theme.bgLooksCanonical ? `Background not canonical (${r.theme.bodyBg}).` : null,
        r.theme.legacyHitCount > 0 ? `Legacy blue tones detected (${r.theme.legacyHitCount} samples).` : null,
        r.theme.creamPaper > 0 ? "Legacy cream/paper layout detected." : null,
      ]
        .filter(Boolean)
        .join(" "),
}));

console.log("\n--- JSON ---");
console.log(JSON.stringify(report, null, 2));
