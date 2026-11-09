#!/usr/bin/env node
// Minimal, dependency-free validation of the Retroverse agent handoff checkpoint.
import { readFileSync } from "node:fs";

const path = process.argv[2] || "docs/agents/checkpoints/retroverse.json";
const errors = [];
let data;
try {
  data = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  console.error(`FAIL: cannot read valid JSON at ${path}: ${error.message}`);
  process.exit(1);
}
const nonempty = (value) => typeof value === "string" && value.trim().length > 0;
const check = (condition, message) => { if (!condition) errors.push(message); };
const evidenceOK = (value) => Array.isArray(value) && value.length > 0 && value.every(nonempty);

check(data.schemaVersion === 1, "schemaVersion must equal 1");
check(data.project === "Retroverse", "project must be Retroverse");
check(nonempty(data.scope), "scope is required");
check(/^\d{4}-\d{2}-\d{2}$/.test(data.lastUpdated || ""), "lastUpdated must be YYYY-MM-DD");
check(nonempty(data.currentObjective), "currentObjective is required");
check(data.lastTask && nonempty(data.lastTask.title), "lastTask.title is required");
check(["COMPLETE", "WAITING", "FAILED"].includes(data.lastTask?.executionState), "lastTask.executionState must be COMPLETE, WAITING, or FAILED");
check(nonempty(data.lastTask?.summary), "lastTask.summary is required");
check(evidenceOK(data.lastTask?.evidence), "lastTask requires evidence");
check(Array.isArray(data.completed), "completed must be an array");
for (const [i, item] of (Array.isArray(data.completed) ? data.completed : []).entries()) {
  check(nonempty(item.item), `completed[${i}].item is required`);
  check(evidenceOK(item.evidence), `completed[${i}] requires evidence`);
}
check(Array.isArray(data.decisions), "decisions must be an array");
for (const [i, item] of (Array.isArray(data.decisions) ? data.decisions : []).entries()) {
  check(nonempty(item.date) && nonempty(item.decision) && nonempty(item.provenance), `decisions[${i}] requires date, decision, provenance`);
  check(evidenceOK(item.evidence), `decisions[${i}] requires evidence`);
}
check(Array.isArray(data.blockers), "blockers must be an array");
check(nonempty(data.nextAction), "nextAction is required");
check(["NOT_RUN", "PASS", "FAIL"].includes(data.handoffTest?.status), "handoffTest.status must be NOT_RUN, PASS, or FAIL");
if (data.handoffTest?.status === "PASS") {
  check(nonempty(data.handoffTest.testedAt), "PASS requires testedAt");
  check(evidenceOK(data.handoffTest.evidence), "PASS requires evidence");
}
if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log(`PASS: checkpoint valid (${data.project}, last task ${data.lastTask.executionState}, handoff ${data.handoffTest.status})`);
