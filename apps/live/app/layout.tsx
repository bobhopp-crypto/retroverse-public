import type { Metadata } from "next";
import { cookies } from "next/headers";

import { RetroverseGlobalNav } from "@/components/shell/RetroverseGlobalNav";
import { VdjAutoFollower } from "@/components/retroverse-live/VdjAutoFollower";
import { OPS_GATE_COOKIE, isOpsEnabled } from "@/lib/ops/ops-gate";

import "./globals.css";
import "./public-mobile-width.css";
import "./retroverse-print.css";

export const metadata: Metadata = {
  title: "Retroverse",
  description: "Time is not a list. It's a place.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const opsEnabled = isOpsEnabled();
  const cookieStore = await cookies();
  const opsAuthenticated = cookieStore.get(OPS_GATE_COOKIE)?.value === "ok";

  return (
    <html lang="en">
      <body>
        <RetroverseGlobalNav
          opsEnabled={opsEnabled}
          opsAuthenticated={opsAuthenticated}
        />
        <VdjAutoFollower />
        {children}
      </body>
    </html>
  );
}
