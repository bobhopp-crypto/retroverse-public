import type { ReactNode } from "react";
import { headers } from "next/headers";

import { BobosNav } from "@/components/bobos/BobosNav";

import "./bobos.css";

export default async function BobosLayout({ children }: { children: ReactNode }) {
  const bareFactoryPreview = (await headers()).get("x-factory-homepage-preview") === "1";
  if (bareFactoryPreview) return children;

  return (
    <div className="bobos-shell">
      <BobosNav />
      {children}
    </div>
  );
}
