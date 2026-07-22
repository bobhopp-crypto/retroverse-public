import "server-only";

import { passQrUrl } from "@/lib/bobos/pass-studio/qr";
import { loadSerialRecords, reserveSerialRecords } from "@/lib/bobos/pass-studio/print-batch-store";
import { formatRetroverseSerial } from "@/lib/bobos/pass-studio/serials";
import { nextSerialStart } from "@/lib/bobos/pass-studio/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";

import type { CredentialsCredentialType } from "./generation";

export type CredentialSerialMap = Partial<Record<CredentialsCredentialType, string>>;
export type CredentialProductionSerialMap = Partial<Record<CredentialsCredentialType, string[]>>;

const TYPE_LABEL: Record<CredentialsCredentialType, string> = {
  event: "Event Pass",
  vip: "VIP Pass",
  backstage: "Backstage Pass",
};

function serialNumber(serial: string): number {
  const match = /(\d+)$/.exec(serial);
  return match ? Number(match[1]) : 0;
}

let allocationQueue: Promise<void> = Promise.resolve();

function withAllocationLock<T>(work: () => Promise<T>): Promise<T> {
  const result = allocationQueue.then(work, work);
  allocationQueue = result.then(() => undefined, () => undefined);
  return result;
}

/**
 * Allocate only once, when a Credentials record is first saved to its Library.
 * Existing saved serials remain stable; duplication clears them before the copy is saved.
 */
export function allocateCredentialSerials(input: {
  recordId: string;
  eventName: string;
  credentialTypes: CredentialsCredentialType[];
  existing?: CredentialSerialMap;
}): Promise<CredentialSerialMap> {
  return withAllocationLock(async () => {
    const serials: CredentialSerialMap = {};
    for (const type of input.credentialTypes) {
      const existing = normalizePassSerial(input.existing?.[type]);
      if (existing) serials[type] = existing;
    }

    const missing = input.credentialTypes.filter((type) => !serials[type]);
    if (missing.length === 0) return serials;

    const [libraryNext, records] = await Promise.all([nextSerialStart(), loadSerialRecords()]);
    const recordNext = records.reduce(
      (next, record) => Math.max(next, serialNumber(record.serial) + 1),
      1,
    );
    let next = Math.max(libraryNext, recordNext, 1);
    for (const type of missing) {
      serials[type] = formatRetroverseSerial(next);
      next += 1;
    }

    const batchId = `credentials-${input.recordId}`;
    await reserveSerialRecords(
      missing.map((type) => {
        const serial = serials[type]!;
        return {
          serial,
          batchId,
          eventId: input.recordId,
          passType: TYPE_LABEL[type],
          qrUrl: passQrUrl(serial),
        };
      }),
    );
    return serials;
  });
}

/** Allocate one scan-ready serial per printed copy while preserving any serials already issued for this run. */
export function allocateCredentialProductionSerials(input: {
  recordId: string;
  eventName: string;
  quantities: Partial<Record<CredentialsCredentialType, number>>;
  existing?: CredentialProductionSerialMap;
  startingSerial?: string;
}): Promise<CredentialProductionSerialMap> {
  return withAllocationLock(async () => {
    const records = await loadSerialRecords();
    const validExisting = new Set(
      records
        .filter((record) => record.eventId === input.recordId)
        .map((record) => record.serial),
    );
    const serials: CredentialProductionSerialMap = {};
    let missingCount = 0;
    for (const type of Object.keys(TYPE_LABEL) as CredentialsCredentialType[]) {
      const quantity = Math.max(0, Math.min(500, Math.floor(input.quantities[type] ?? 0)));
      const retained = (input.existing?.[type] ?? [])
        .map(normalizePassSerial)
        .filter((value): value is string => typeof value === "string" && validExisting.has(value))
        .slice(0, quantity);
      serials[type] = retained;
      missingCount += quantity - retained.length;
    }
    if (missingCount === 0) return serials;

    const libraryNext = await nextSerialStart();
    const requestedStart = input.startingSerial ? serialNumber(input.startingSerial) : 0;
    let next = Math.max(libraryNext, records.reduce((value, record) => Math.max(value, serialNumber(record.serial) + 1), 1), requestedStart || 1);
    const reservations: Array<{ serial: string; batchId: string; eventId: string; passType: string; qrUrl: string }> = [];
    const batchId = `credentials-production-${input.recordId}-${Date.now().toString(36)}`;
    for (const type of Object.keys(TYPE_LABEL) as CredentialsCredentialType[]) {
      const quantity = Math.max(0, Math.min(500, Math.floor(input.quantities[type] ?? 0)));
      const values = serials[type] ?? [];
      while (values.length < quantity) {
        const serial = formatRetroverseSerial(next++);
        values.push(serial);
        reservations.push({ serial, batchId, eventId: input.recordId, passType: TYPE_LABEL[type], qrUrl: passQrUrl(serial) });
      }
      serials[type] = values;
    }
    if (reservations.length) await reserveSerialRecords(reservations);
    return serials;
  });
}
