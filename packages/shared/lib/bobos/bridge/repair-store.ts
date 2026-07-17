import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RepairProposal, RepairStatus } from "./repair-engine";

const dir = path.join(process.cwd(), "reports", "graph-bridge");
const file = path.join(dir, "repair-queue.json");
export async function loadRepairQueue(): Promise<RepairProposal[]> { try { return JSON.parse(await readFile(file, "utf8")) as RepairProposal[]; } catch { return []; } }
export async function saveRepairQueue(queue: RepairProposal[]): Promise<void> { await mkdir(dir, { recursive: true }); await writeFile(file, JSON.stringify(queue, null, 2)); }
export async function updateRepairStatus(id: string, status: RepairStatus): Promise<RepairProposal | null> { const queue = await loadRepairQueue(); const item = queue.find((proposal) => proposal.id === id); if (!item) return null; item.status = status; if (status === "Approved") item.approvedAt = new Date().toISOString(); if (status === "Verified") item.verifiedAt = new Date().toISOString(); await saveRepairQueue(queue); return item; }
