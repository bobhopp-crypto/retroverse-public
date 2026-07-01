import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Generator — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function OpsPassesPage() {
  redirect("/bobos/passes");
}
