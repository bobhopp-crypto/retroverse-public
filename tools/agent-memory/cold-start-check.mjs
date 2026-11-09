#!/usr/bin/env node
// Cold-start handoff check. This process has no access to prior chat context.
// It is NOT an independent AI-agent resumption test.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const checkpointPath = "docs/agents/checkpoints/retroverse.json";
const protocolPath = "docs/agents/AGENT_MEMORY_PROTOCOL.md";
const cursorPath = ".cursor/rules/retroverse-memory.mdc";
const codexPath = "AGENTS.md";
const checkpoint = JSON.parse(readFileSync(checkpointPath, "utf8"));
const protocol = readFileSync(protocolPath, "utf8");
const cursorRule = readFileSync(cursorPath, "utf8");
const codexRule = readFileSync(codexPath, "utf8");

execFileSync(process.execPath, ["tools/agent-memory/validate-checkpoint.mjs", checkpointPath], { stdio: "inherit" });

for (const [label, content] of [["protocol", protocol], ["Cursor instructions", cursorRule], ["Codex/Work instructions", codexRule]]) {
  if (!content.includes(checkpointPath)) throw new Error(`${label} does not link to the shared checkpoint`);
}
if (!protocol.includes("Studio") || !codexRule.includes("Studio")) throw new Error("Studio phase boundaries missing");
if (checkpoint.handoffTest.status === "PASS" && !checkpoint.handoffTest.evidence.length) throw new Error("Unproven independent handoff claim");

const handoff = {
  project: checkpoint.project,
  objective: checkpoint.currentObjective,
  lastVerifiedTask: checkpoint.lastTask.title,
  executionState: checkpoint.lastTask.executionState,
  evidence: checkpoint.lastTask.evidence,
  blockers: checkpoint.blockers,
  nextAction: checkpoint.nextAction,
  independentAgentTest: checkpoint.handoffTest.status,
};
if (!handoff.lastVerifiedTask || !handoff.nextAction || !handoff.evidence.length) {
  throw new Error("Fresh process could not reconstruct the handoff");
}
console.log("COLD START: Reconstructed handoff from repository files only.");
console.log(JSON.stringify(handoff, null, 2));
console.log("NOTE: This verifies the handoff contract in a fresh process, NOT a separate AI agent.");
