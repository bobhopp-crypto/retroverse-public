import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

import { opsStateDir } from "@/lib/ops/ops-state-path";

import type { PassRegistration, PassRegistrationsFile } from "./types";

function registrationsPath(): string {
  return join(opsStateDir(), "sunday-nights", "registrations.json");
}

function emptyFile(): PassRegistrationsFile {
  return { version: 1, registrations: [] };
}

async function loadFile(): Promise<PassRegistrationsFile> {
  try {
    const raw = await readFile(registrationsPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<PassRegistrationsFile>;
    if (!parsed || !Array.isArray(parsed.registrations)) return emptyFile();
    return { version: 1, registrations: parsed.registrations };
  } catch {
    return emptyFile();
  }
}

export async function registerCollectorPass(input: {
  passNumber: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}): Promise<PassRegistration> {
  const passNumber = input.passNumber.trim();
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email?.trim() || null;

  if (!passNumber || !firstName || !lastName) {
    throw new Error("Pass number, first name, and last name are required.");
  }

  const entry: PassRegistration = {
    passNumber,
    firstName,
    lastName,
    email,
    registeredAt: new Date().toISOString(),
  };

  const file = await loadFile();
  file.registrations.push(entry);

  const dir = join(opsStateDir(), "sunday-nights");
  await mkdir(dir, { recursive: true });
  await writeFile(registrationsPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");

  return entry;
}
