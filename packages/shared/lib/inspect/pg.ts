import { Pool, type PoolConfig } from "pg";

let pool: Pool | null = null;

function pgSsl(): PoolConfig["ssl"] {
  const host = (process.env.RETROVERSE_PG_HOST ?? "localhost").trim();
  if (host === "localhost" || host === "127.0.0.1") return undefined;
  if (process.env.RETROVERSE_PG_SSL === "0") return undefined;
  return { rejectUnauthorized: false };
}

export function getInspectPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.RETROVERSE_PG_HOST ?? "localhost",
      port: Number(process.env.RETROVERSE_PG_PORT ?? "5432"),
      database: process.env.RETROVERSE_PG_DATABASE ?? "retroverse",
      user: process.env.RETROVERSE_PG_USER ?? "bobhopp",
      password: process.env.RETROVERSE_PG_PASSWORD ?? "",
      ssl: pgSsl(),
      max: 10,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
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

export async function inspectExecute(text: string, params?: unknown[]): Promise<number> {
  const result = await getInspectPool().query(text, params);
  return result.rowCount ?? 0;
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
