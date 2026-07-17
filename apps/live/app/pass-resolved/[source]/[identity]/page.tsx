import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { decodeResolvedPass, RESOLVED_PASS_HEADER } from "@/lib/retroverse-pass/resolved-payload";
import { PassExperienceShell } from "@/lib/retroverse-pass/pass-experience-shell";

import "../../../home-broadcast.css";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ source: string; identity: string }>;
  searchParams: Promise<{ p?: string }>;
};

export default async function ResolvedPassPage({ params, searchParams }: Props) {
  const requestHeaders = await headers();
  const { source, identity } = await params;
  const { p } = await searchParams;
  const rewritten = requestHeaders.get("x-retroverse-pass-rewrite") === "1";

  if (source === "postgres") {
    const scan = decodeResolvedPass(
      rewritten ? requestHeaders.get(RESOLVED_PASS_HEADER) : (p ?? null),
    );
    if (!scan || scan.pass.serial !== identity) notFound();
    return <PassExperienceShell scan={scan} />;
  }

  notFound();
}
