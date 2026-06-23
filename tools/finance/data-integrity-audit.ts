#!/usr/bin/env node
/**
 * Finance Data Integrity Audit
 * Run: npx tsx tools/finance/data-integrity-audit.ts
 */
require("./preload-server-only.cjs");
require("tsx/cjs/api").register();
require("./data-integrity-audit-runner.ts");
