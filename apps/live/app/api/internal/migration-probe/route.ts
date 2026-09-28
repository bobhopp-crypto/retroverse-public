import { timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const expected = process.env.RETROVERSE_MIGRATION_PROBE_TOKEN;
  const provided = req.headers.get("x-migration-probe-token");
  if (!expected || !provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response(null, { status: 404 });
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return NextResponse.json({ configured: false }, { status: 503 });
  const key = `rv:migration-probe:${randomUUID()}`;
  const value = randomUUID();
  async function command(parts: Array<string | number>) {
    const response = await fetch(url!, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(parts),
      cache: "no-store",
    });
    const data = await response.json() as { result?: unknown; error?: string };
    if (!response.ok || data.error) throw new Error(`Redis command failed: ${response.status}`);
    return data.result;
  }
  try {
    const written = await command(["SET", key, value, "EX", 60]);
    const read = await command(["GET", key]);
    const removed = await command(["DEL", key]);
    const afterDelete = await command(["GET", key]);
    return NextResponse.json({ configured: true, write: written === "OK", readBack: read === value, deleted: removed === 1 && afterDelete === null, ttlSeconds: 60 });
  } catch (error) {
    await command(["DEL", key]).catch(() => undefined);
    console.error("[migration-probe] Redis check failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ configured: true, error: "Redis check failed" }, { status: 503 });
  }
}
