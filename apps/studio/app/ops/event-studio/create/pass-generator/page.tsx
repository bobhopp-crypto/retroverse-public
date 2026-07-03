import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Studio — Retroverse Ops",
  robots: { index: false, follow: false },
};

/** Pass Studio moved to BobOS — this route now only redirects. */
export default function EventStudioPassGeneratorPage() {
  redirect("/bobos/passes");
}
