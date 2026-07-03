import type { CollectorPassRegistration } from "./types";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function collectorPassRegistrationsToCsv(
  rows: CollectorPassRegistration[],
): string {
  const header = "pass_number,first_name,last_name,email,created_at";
  const lines = rows.map((row) =>
    [
      csvEscape(row.passNumber),
      csvEscape(row.firstName),
      csvEscape(row.lastName),
      csvEscape(row.email ?? ""),
      csvEscape(row.createdAt),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}
