import { NextResponse } from "next/server";

import {
  getFinanceAccountById,
  mergeFinanceAccounts,
  renameFinanceAccount,
  setFinanceAccountActive,
} from "@/lib/ops/finance/db/accounts";
import { ensureFinanceSchema } from "@/lib/ops/finance/db/ensure-schema";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }
  await ensureFinanceSchema();

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json()) as {
    name?: string;
    active?: boolean;
    mergeIntoId?: number;
  };

  try {
    if (body.mergeIntoId) {
      await mergeFinanceAccounts(id, body.mergeIntoId);
      const target = await getFinanceAccountById(body.mergeIntoId);
      return NextResponse.json({ ok: true, account: target });
    }
    if (typeof body.name === "string" && body.name.trim()) {
      const account = await renameFinanceAccount(id, body.name);
      return NextResponse.json({ account });
    }
    if (typeof body.active === "boolean") {
      await setFinanceAccountActive(id, body.active);
      const account = await getFinanceAccountById(id);
      return NextResponse.json({ account });
    }
    return NextResponse.json({ error: "No valid update fields" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
