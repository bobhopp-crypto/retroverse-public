import { Pool, type PoolConfig, type QueryResultRow } from "pg";

/**
 * Authoritative Postgres connection for the permanent pass registration system.
 *
 * Live /pass/[serial] and Studio RV02-05 must share this pool.
 * Never defaults to localhost — misconfiguration must fail loudly.
 *
 * Resolution order:
 *   1) RETROVERSE_PASS_PG_* (preferred, pass-specific)
 *   2) RETROVERSE_PG_* when host is a non-local production host
 *
 * Localhost is allowed only when RETROVERSE_PASS_ALLOW_LOCAL=1 (tests).
 */

export class PassDatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PassDatabaseConfigError";
  }
}

export type PassPgIdentity = {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  source: "RETROVERSE_PASS_PG_*" | "RETROVERSE_PG_*";
};

let pool: Pool | null = null;
let cachedIdentity: PassPgIdentity | null = null;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function isLocalHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "";
}

function allowLocal(): boolean {
  return env("RETROVERSE_PASS_ALLOW_LOCAL") === "1";
}

function resolvePassPgConfig(): {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: PoolConfig["ssl"];
  identity: PassPgIdentity;
} {
  const passHost = env("RETROVERSE_PASS_PG_HOST");
  const usePassSpecific = Boolean(passHost);

  const host = usePassSpecific ? passHost : env("RETROVERSE_PG_HOST");
  const port = Number(
    (usePassSpecific ? env("RETROVERSE_PASS_PG_PORT") : env("RETROVERSE_PG_PORT")) || "5432",
  );
  const database = usePassSpecific
    ? env("RETROVERSE_PASS_PG_DATABASE")
    : env("RETROVERSE_PG_DATABASE");
  const user = usePassSpecific ? env("RETROVERSE_PASS_PG_USER") : env("RETROVERSE_PG_USER");
  const password = usePassSpecific
    ? env("RETROVERSE_PASS_PG_PASSWORD")
    : env("RETROVERSE_PG_PASSWORD");
  const source = usePassSpecific ? "RETROVERSE_PASS_PG_*" : "RETROVERSE_PG_*";

  if (!host || !database || !user) {
    throw new PassDatabaseConfigError(
      "Pass database is not configured. Set RETROVERSE_PASS_PG_HOST / _DATABASE / _USER " +
        "(Neon production) for RV02-05 and public claim. Localhost defaults are disabled.",
    );
  }

  if (isLocalHost(host) && !allowLocal()) {
    throw new PassDatabaseConfigError(
      `Pass database host "${host}" is local. RV02-05 and public claim require the Neon ` +
        "production database. Set RETROVERSE_PASS_PG_* to Neon, or set " +
        "RETROVERSE_PASS_ALLOW_LOCAL=1 only for isolated tests.",
    );
  }

  const sslDisabled =
    (usePassSpecific ? env("RETROVERSE_PASS_PG_SSL") : env("RETROVERSE_PG_SSL")) === "0";
  const ssl: PoolConfig["ssl"] =
    !sslDisabled && !isLocalHost(host) ? { rejectUnauthorized: false } : undefined;

  return {
    host,
    port: Number.isFinite(port) ? port : 5432,
    database,
    user,
    password,
    ssl,
    identity: {
      host,
      port: Number.isFinite(port) ? port : 5432,
      database,
      user,
      ssl: Boolean(ssl),
      source,
    },
  };
}

/** Non-secret connection identity for ops banners / verification. */
export function getPassPgIdentity(): PassPgIdentity {
  if (cachedIdentity) return cachedIdentity;
  const { identity } = resolvePassPgConfig();
  cachedIdentity = identity;
  return identity;
}

export function getPassPool(): Pool {
  if (!pool) {
    const cfg = resolvePassPgConfig();
    cachedIdentity = cfg.identity;
    pool = new Pool({
      host: cfg.host,
      port: cfg.port,
      database: cfg.database,
      user: cfg.user,
      password: cfg.password,
      ssl: cfg.ssl,
      max: 10,
      connectionTimeoutMillis: 30_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

export async function passQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPassPool().query<T>(text, params);
  return result.rows;
}

export async function passPing(): Promise<{
  ok: boolean;
  error?: string;
  identity?: PassPgIdentity;
}> {
  try {
    const identity = getPassPgIdentity();
    await passQuery<{ ok: number }>("SELECT 1::int AS ok");
    return { ok: true, identity };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}
