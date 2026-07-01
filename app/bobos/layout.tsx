import type { ReactNode } from "react";

import { BobosNav } from "@/components/bobos/BobosNav";

import "./bobos.css";

export default function BobosLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bobos-shell">
      <BobosNav />
      {children}
    </div>
  );
}
