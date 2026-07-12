import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { registerPassInLibraryFile } from "./library-file";
import { normalizePassSerial } from "./serials";
import type { GeneratedPass, PassLibraryFile, PassRegistration } from "./types";

function pass(id: string, serialNumber: number, registration: PassRegistration | null = null): GeneratedPass {
  return {
    id, serial: String(serialNumber).padStart(4, "0"), serialNumber, batchId: "batch", eventId: "event",
    eventName: "Fixture", venue: "Fixture", date: "2026-07-12", passType: "General",
    templateId: "template", generationId: null, front: { artworkUrl: null },
    back: { artworkUrl: null }, qr: { url: "https://retroverse.live/pass", svg: "" },
    status: registration ? "registered" : "available", registration,
    createdAt: "2026-07-12T00:00:00.000Z",
  };
}

function registration(name: string): PassRegistration {
  return { firstName: name, lastName: "", email: "", phone: "", city: "", notes: "", giveawayOptIn: false, registeredAt: "2026-07-12T00:00:00.000Z" };
}

test("concurrent registrations of different passes both persist", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "retroverse-pass-library-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "library.json");
  await writeFile(path, JSON.stringify({ version: 1, passes: [pass("id-a", 500), pass("id-b", 501)] }));

  await Promise.all([
    registerPassInLibraryFile(path, normalizePassSerial("0500")!, "id-a", registration("Alice")),
    registerPassInLibraryFile(path, normalizePassSerial("0501")!, "id-b", registration("Bob")),
  ]);

  const file = JSON.parse(await readFile(path, "utf8")) as PassLibraryFile;
  assert.equal(file.passes.find((item) => item.id === "id-a")?.registration?.firstName, "Alice");
  assert.equal(file.passes.find((item) => item.id === "id-b")?.registration?.firstName, "Bob");
});

test("same-pass registration remains idempotent", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "retroverse-pass-library-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const path = join(directory, "library.json");
  await writeFile(path, JSON.stringify({ version: 1, passes: [pass("id-a", 500, registration("Original"))] }));

  const result = await registerPassInLibraryFile(path, normalizePassSerial("0500")!, "id-a", registration("Replacement"));
  assert.equal(result.state, "registered");
  if (result.state !== "registered") assert.fail("Expected registered result");
  assert.equal(result.changed, false);
  assert.equal(result.pass.registration?.firstName, "Original");
  const file = JSON.parse(await readFile(path, "utf8")) as PassLibraryFile;
  assert.equal(file.passes[0]?.registration?.firstName, "Original");
});
