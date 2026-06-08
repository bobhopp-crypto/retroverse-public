import assert from "node:assert/strict";

import { subjectFromTitle } from "@/lib/ops/media-lab/harvest/filenames";
import { findHarvestConflicts } from "@/lib/ops/media-lab/harvest/export-harvest";
import { categoryFolderForLabel } from "@/lib/ops/media-lab/harvest/paths";

assert.equal(subjectFromTitle("Commercial - Taco Bell"), "Taco Bell");
assert.equal(subjectFromTitle("Interview - Christy Brinkley"), "Christy Brinkley");
assert.equal(subjectFromTitle("Taco Bell"), "Taco Bell");
assert.equal(categoryFolderForLabel("Commercial"), "Commercial");
assert.equal(categoryFolderForLabel(undefined), "Other");
assert.equal(findHarvestConflicts([]).length, 0);

console.log("harvest-library tests ok");
