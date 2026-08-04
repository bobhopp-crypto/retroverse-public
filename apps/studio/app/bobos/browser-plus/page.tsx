import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { HomePageFactory } from "./HomePageFactory";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Home Page Factory — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosHomePageFactoryPage() {
  if (!isOpsEnabled()) notFound();
  return <HomePageFactory />;
}
