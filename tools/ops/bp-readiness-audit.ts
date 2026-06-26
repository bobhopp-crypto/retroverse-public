#!/usr/bin/env npx tsx
/**
 * Validates Browser Plus 3.3 readiness metrics against live loader.
 * Run: NODE_OPTIONS='--require ./tools/finance/preload-server-only.cjs' npx tsx tools/ops/bp-readiness-audit.ts
 */
import { loadBrowserPlus2Model } from "../../lib/ops/browser-plus-2/load-browser-plus-2.ts";

async function main() {
  const model = await loadBrowserPlus2Model();
  const s = model.summary;

  console.log(JSON.stringify(
    {
      summary: s,
      readinessPanels: model.readinessPanels,
      researchQueue: model.researchQueue?.tiers,
      acceptance: {
        sundayReady: model.readinessPanels.find((p) => p.id === "sunday-nights"),
        top100Ready: model.readinessPanels.find((p) => p.id === "top-100"),
        noUsableCoverExpected: "~17",
        experienceReadyExpected: "~1008",
      },
    },
    null,
    2,
  ));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
