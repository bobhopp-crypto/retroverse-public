import type { Metadata } from "next";

import "@/components/pass/pass-registration.css";

export const metadata: Metadata = {
  title: "Pass Registration — Retroverse",
  robots: { index: false, follow: false },
};

/** Friendly fallback for a QR/URL with no serial segment. */
export default function EmptyPassPage() {
  return (
    <main className="pass-reg">
      <section className="pass-reg__card">
        <p className="pass-reg__kicker">Retroverse Pass</p>
        <h1 className="pass-reg__event">Enter your pass number</h1>
        <p className="pass-reg__already-detail">
          The pass number is missing. Please scan the QR code again, or enter the full serial
          printed on your pass after <strong>retroverse.live/pass/</strong>.
        </p>
      </section>
    </main>
  );
}
