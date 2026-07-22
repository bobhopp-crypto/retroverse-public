import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TheBooth } from "@/components/bobos/booth/TheBooth";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Booth — BobOS",
  robots: { index: false, follow: false },
};

export default function BoothPage() {
  if (!shouldAllowOpsRoutes()) notFound();
  return <TheBooth />;
}
