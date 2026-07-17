import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ padding: "4rem 1.5rem", textAlign: "center" }}>
      <h1>Page not found</h1>
      <p>The requested Retroverse page could not be found.</p>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
