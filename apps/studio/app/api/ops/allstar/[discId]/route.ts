import { NextResponse } from "next/server";

import { loadAllStarDisc } from "@/lib/ops/allstar/load-allstar";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ discId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  if (!isOpsEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { discId } = await params;
  const disc = await loadAllStarDisc(discId);
  if (!disc) {
    return NextResponse.json({ error: "Disc not found" }, { status: 404 });
  }

  return NextResponse.json(disc);
}
