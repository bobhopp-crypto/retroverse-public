#!/usr/bin/env node
/**
 * Validates RV Year editorial records and writes data/rv-year/editorial-years.json.
 *
 * Usage: npx tsx tools/rv-year/build-editorial-json.ts
 */

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import {
  RV_YEAR_EDITORIAL_MAX,
  RV_YEAR_EDITORIAL_MIN,
  RV_YEAR_EDITORIAL_RECORDS,
  type RvYearEditorialRecord,
} from "../../packages/shared/lib/rv-year/editorial-records.ts";

function validateRecord(record: RvYearEditorialRecord, errors: string[]): void {
  const prefix = `Year ${record.year}:`;

  if (!Number.isInteger(record.year)) {
    errors.push(`${prefix} year must be an integer`);
  }
  if (!record.headline?.trim()) {
    errors.push(`${prefix} missing headline`);
  }
  if (!record.lead?.trim()) {
    errors.push(`${prefix} missing lead`);
  }
  if (!record.theme?.trim()) {
    errors.push(`${prefix} missing theme`);
  }
  if (!Array.isArray(record.keywords) || record.keywords.length < 3 || record.keywords.length > 6) {
    errors.push(`${prefix} keywords must have 3–6 items (got ${record.keywords?.length ?? 0})`);
  }
  if (
    !Array.isArray(record.definingMoments) ||
    record.definingMoments.length < 3 ||
    record.definingMoments.length > 5
  ) {
    errors.push(
      `${prefix} definingMoments must have 3–5 items (got ${record.definingMoments?.length ?? 0})`,
    );
  }
}

function validateCoverage(errors: string[]): void {
  const years = RV_YEAR_EDITORIAL_RECORDS.map((record) => record.year);
  const seen = new Set<number>();

  for (const year of years) {
    if (seen.has(year)) {
      errors.push(`Duplicate year: ${year}`);
    }
    seen.add(year);

    if (year < RV_YEAR_EDITORIAL_MIN || year > RV_YEAR_EDITORIAL_MAX) {
      errors.push(`Out-of-range year: ${year}`);
    }
  }

  for (let year = RV_YEAR_EDITORIAL_MIN; year <= RV_YEAR_EDITORIAL_MAX; year += 1) {
    if (!seen.has(year)) {
      errors.push(`Missing year: ${year}`);
    }
  }

  const headlines = RV_YEAR_EDITORIAL_RECORDS.map((record) => record.headline.trim().toLowerCase());
  const headlineCounts = new Map<string, number>();
  for (const headline of headlines) {
    headlineCounts.set(headline, (headlineCounts.get(headline) ?? 0) + 1);
  }
  for (const [headline, count] of headlineCounts) {
    if (count > 1) {
      errors.push(`Duplicate headline (${count}x): ${headline}`);
    }
  }
}

async function main(): Promise<void> {
  const errors: string[] = [];

  validateCoverage(errors);
  for (const record of RV_YEAR_EDITORIAL_RECORDS) {
    validateRecord(record, errors);
  }

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const outDir = join(process.cwd(), "data/rv-year");
  await mkdir(outDir, { recursive: true });

  const outPath = join(outDir, "editorial-years.json");
  await writeFile(outPath, `${JSON.stringify(RV_YEAR_EDITORIAL_RECORDS, null, 2)}\n`, "utf8");

  console.log(`Wrote ${RV_YEAR_EDITORIAL_RECORDS.length} editorial records to ${outPath}`);
  console.log(`Year range: ${RV_YEAR_EDITORIAL_MIN}–${RV_YEAR_EDITORIAL_MAX}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
