import type { Metadata } from "next";
import "./globals.css";
import "./retroverse-print.css";

export const metadata: Metadata = {
  title: "Retroverse",
  description: "Time is not a list. It's a place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
