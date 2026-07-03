/* Browser verification for the BobOS Cockpit UI polish sprint.
   Screenshots every modified page and reports console/page errors. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const PROJECT_ID = process.env.PROJECT_ID || "f244eb49-9c60-4159-b1cd-50e5c5af5e5f";
const OUT = "tools/sprint-screenshots/polish";

const PAGES = [
  { id: "01-cockpit", path: "/bobos" },
  { id: "02-event-hub", path: "/bobos/event" },
  { id: "03-producer", path: "/bobos/producer" },
  { id: "04-pass-studio", path: "/bobos/passes" },
  { id: "05-giveaway", path: "/ops/event-studio/giveaway" },
  { id: "06-registration", path: "/ops/event-studio/giveaway/registration" },
  { id: "07-homepage", path: "/ops/event-studio/homepage" },
  { id: "08-pipeline", path: "/bobos/pipeline" },
  { id: "09-ai-usage", path: "/bobos/ai" },
  { id: "10-project", path: `/bobos/project/${PROJECT_ID}` },
  { id: "11-pass-workspace", path: `/bobos/project/${PROJECT_ID}/workspace/passes` },
  { id: "12-workspace-placeholder", path: `/bobos/project/${PROJECT_ID}/workspace/giveaway` },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1680, height: 1050 } });
// Ops gate cookie so /ops pages and producer APIs render instead of the PIN screen.
const { hostname } = new URL(BASE);
await context.addCookies([
  { name: "retroverse_ops_gate", value: "ok", domain: hostname, path: "/" },
]);
const page = await context.newPage();

let failures = 0;
for (const target of PAGES) {
  const errors = [];
  const onPageError = (err) => errors.push(`pageerror: ${err.message}`);
  const onConsole = (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);

  try {
    const res = await page.goto(`${BASE}${target.path}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    const status = res?.status() ?? 0;
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${target.id}.png`, fullPage: false });

    const relevant = errors.filter(
      (e) => !e.includes("Failed to load resource") && !e.includes("net::ERR"),
    );
    if (status >= 400) {
      failures += 1;
      console.log(`FAIL ${target.id} — HTTP ${status}`);
    } else if (relevant.length > 0) {
      failures += 1;
      console.log(`FAIL ${target.id} — ${relevant[0]}`);
    } else {
      console.log(`PASS ${target.id} (${status})`);
    }
  } catch (err) {
    failures += 1;
    console.log(`FAIL ${target.id} — ${err.message.split("\n")[0]}`);
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
  }
}

await browser.close();
console.log(failures === 0 ? "ALL PASS" : `${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
