import { inspectPing, inspectQuery } from "@/lib/inspect/pg";

export async function pgSundayNightsGet<T extends Record<string, unknown>>(
  key: string,
): Promise<T | null> {
  const ping = await inspectPing();
  if (!ping.ok) return null;

  try {
    const rows = await inspectQuery<{ value: T }>(
      `SELECT value FROM sunday_nights_state WHERE key = $1 LIMIT 1`,
      [key],
    );
    const raw = rows[0]?.value;
    if (!raw || typeof raw !== "object") return null;
    return raw;
  } catch {
    return null;
  }
}

export async function pgSundayNightsSet(
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  const ping = await inspectPing();
  if (!ping.ok) {
    throw new Error(ping.error ?? "Postgres offline — cannot save Sunday Nights state");
  }

  try {
    await inspectQuery(
      `
      INSERT INTO sunday_nights_state (key, value, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now()
      `,
      [key, JSON.stringify(value)],
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("sunday_nights_state")) {
      throw new Error(
        "Sunday Nights state table missing — run docs/migrations/sunday-nights-state.sql on production Postgres",
      );
    }
    throw err;
  }
}
