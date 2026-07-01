import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectZeroHome } from "@/components/bobos/project-zero/ProjectZeroHome";
import { listProjects } from "@/lib/bobos/project-zero/store";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const metadata: Metadata = {
  title: "BobOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function BobosPage() {
  if (!shouldAllowOpsRoutes()) notFound();

  const projects = await listProjects();

  return <ProjectZeroHome initialProjects={projects} />;
}
