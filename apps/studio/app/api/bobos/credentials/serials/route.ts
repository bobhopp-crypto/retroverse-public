import { NextResponse } from "next/server";

import {
  allocateCredentialSerials,
  allocateCredentialProductionSerials,
  type CredentialSerialMap,
  type CredentialProductionSerialMap,
} from "@/lib/bobos/credentials/serial-allocation";
import type { CredentialsCredentialType } from "@/lib/bobos/credentials/generation";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CREDENTIAL_TYPES = new Set<CredentialsCredentialType>(["event", "vip", "backstage"]);

export async function POST(request: Request) {
  if (!shouldAllowOpsRoutes(request.headers.get("host"))) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const recordId = typeof body.recordId === "string" ? body.recordId.trim() : "";
  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
  const credentialTypes = Array.isArray(body.credentialTypes)
    ? body.credentialTypes.filter(
        (value): value is CredentialsCredentialType =>
          typeof value === "string" && CREDENTIAL_TYPES.has(value as CredentialsCredentialType),
      )
    : [];
  const existing =
    body.existing && typeof body.existing === "object" && !Array.isArray(body.existing)
      ? (body.existing as CredentialSerialMap)
      : undefined;

  const quantities = body.quantities && typeof body.quantities === "object" && !Array.isArray(body.quantities)
    ? Object.fromEntries((Object.keys(body.quantities) as CredentialsCredentialType[]).filter((type) => CREDENTIAL_TYPES.has(type)).map((type) => [type, Math.max(0, Math.min(500, Math.floor(Number((body.quantities as Record<string, unknown>)[type]) || 0)))]))
    : null;

  if (!recordId || !eventName || (!quantities && credentialTypes.length === 0)) {
    return NextResponse.json({ error: "Credential record information is incomplete." }, { status: 400 });
  }

  try {
    if (quantities) {
      const productionSerials = await allocateCredentialProductionSerials({
        recordId,
        eventName,
        quantities,
        existing: body.productionExisting && typeof body.productionExisting === "object" ? body.productionExisting as CredentialProductionSerialMap : undefined,
        startingSerial: typeof body.startingSerial === "string" ? body.startingSerial.trim() : undefined,
      });
      return NextResponse.json({ ok: true, productionSerials });
    }
    const serials = await allocateCredentialSerials({
      recordId,
      eventName,
      credentialTypes,
      existing,
    });
    return NextResponse.json({ ok: true, serials });
  } catch (error) {
    console.error("[credentials:serials]", error);
    return NextResponse.json({ error: "Serial allocation failed." }, { status: 500 });
  }
}
