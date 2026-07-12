import type { Metadata } from "next";

import { PassRegistrationView } from "@/components/pass/PassRegistrationView";
import { findPassBySerial } from "@/lib/ops/event-studio/pass-studio/store";
import { normalizePassSerial } from "@/lib/ops/event-studio/pass-studio/serials";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ serial: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { serial } = await params;
  const decoded = safeDecodeSerial(serial);
  return {
    title: decoded ? `Pass ${decoded} — Retroverse` : "Pass Registration — Retroverse",
    robots: { index: false, follow: false },
  };
}

function safeDecodeSerial(value: string): string | null {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return null;
  }
}

function PassScanError({ malformed }: { malformed: boolean }) {
  return (
    <main className="pass-reg">
      <section className="pass-reg__card">
        <p className="pass-reg__kicker">Retroverse Pass</p>
        <h1 className="pass-reg__event">We couldn&apos;t find that pass</h1>
        <p className="pass-reg__already-detail">
          {malformed
            ? "The pass number is incomplete or invalid."
            : "This pass number is not in the Retroverse pass library."}
        </p>
        <p className="pass-reg__already-detail">
          Please scan the QR code again, or manually enter the serial printed on your pass.
        </p>
      </section>
    </main>
  );
}

export default async function PassPage({ params }: Props) {
  const { serial: rawSerial } = await params;
  const raw = safeDecodeSerial(rawSerial);
  if (!raw || !normalizePassSerial(raw)) return <PassScanError malformed />;

  const pass = await findPassBySerial(raw);
  if (!pass) return <PassScanError malformed={false} />;

  return <PassRegistrationView pass={pass} />;
}
