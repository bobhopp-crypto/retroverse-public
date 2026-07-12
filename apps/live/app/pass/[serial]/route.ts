import { handlePassScan } from "@/lib/retroverse-pass/scan-handler";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ serial: string }> };
export async function GET(request: Request, { params }: Context) {
  const { serial } = await params;
  return handlePassScan(request, serial);
}
