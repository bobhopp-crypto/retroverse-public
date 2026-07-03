import { inspectPing } from "@/lib/inspect/pg";
import { welcomeUpstreamBase } from "@/lib/control-center/welcome-base";

export type StatusLight = {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
};

async function checkWelcomeUpstream(): Promise<{ ok: boolean; detail: string }> {
  const base = welcomeUpstreamBase();
  if (!base) {
    return { ok: false, detail: "No SEARCH_UPSTREAM_BASE_URL / RETROVERSE_WELCOME_URL" };
  }
  const url = `${base.replace(/\/$/, "")}/api/home-search?q=ma`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { ok?: boolean };
    return { ok: body.ok === true, detail: base };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}

async function checkSearchApi(publicOrigin: string): Promise<{ ok: boolean; detail: string }> {
  const url = `${publicOrigin.replace(/\/$/, "")}/api/search?q=mad`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as { ok?: boolean };
    return {
      ok: body.ok === true,
      detail: body.ok === true ? "proxy OK" : "upstream error in payload",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}

export function publicOriginForStatus(): string {
  if (process.env.RETROVERSE_PUBLIC_URL?.trim()) {
    return process.env.RETROVERSE_PUBLIC_URL.trim().replace(/\/$/, "");
  }
  const port = process.env.PORT?.trim() || "3000";
  return `http://localhost:${port}`;
}

export async function loadControlCenterStatus(): Promise<StatusLight[]> {
  const publicOrigin = publicOriginForStatus();
  const [pg, welcome, search] = await Promise.all([
    inspectPing(),
    checkWelcomeUpstream(),
    checkSearchApi(publicOrigin),
  ]);

  return [
    { id: "public", label: "PUBLIC site", ok: true, detail: publicOrigin },
    {
      id: "welcome",
      label: "Welcome upstream",
      ok: welcome.ok,
      detail: welcome.detail,
    },
    {
      id: "pg",
      label: "Postgres graph",
      ok: pg.ok,
      detail: pg.ok ? "retroverse @ localhost" : (pg.error ?? "offline"),
    },
    {
      id: "search",
      label: "Search API",
      ok: search.ok,
      detail: search.detail,
    },
  ];
}
