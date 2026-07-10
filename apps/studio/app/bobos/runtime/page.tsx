import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

import { RuntimePageView } from "./RuntimePageView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Runtime — BobOS",
  robots: { index: false, follow: false },
};

export default function RuntimePage() {
  if (!shouldAllowOpsRoutes()) notFound();
  return <RuntimePageView />;
}
