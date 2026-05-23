import { Pool } from "pg";

let pool: Pool | null = null;

export function getInspectPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.RETROVERSE_PG_HOST ?? "localhost",
      port: Number(process.env.RETROVERSE_PG_PORT ?? "5432"),
      database: process.env.RETROVERSE_PG_DATABASE ?? "retroverse",
      user: process.env.RETROVERSE_PG_USER ?? "bobhopp",
      password: process.env.RETROVERSE_PG_PASSWORD ?? "",
      max: 3,
    });
  }
  return pool;
}

export async function inspectQuery<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getInspectPool().query(text, params);
  return result.rows as T[];
}

export async function inspectPing(): Promise<{ ok: boolean; error?: string }> {
  try {
    await inspectQuery<{ ok: number }>("SELECT 1::int AS ok");
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
