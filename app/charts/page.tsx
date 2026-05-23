export const metadata = {
  title: "RV Charts — RetroVerse",
};

/** Placeholder — full RV Week / chart snapshot explorer ships later. */
export default function ChartsPage() {
  return (
    <main className="search-page" style={{ minHeight: "60vh", padding: "1.5rem 1rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900, letterSpacing: "0.04em" }}>
        RV CHARTS
      </h1>
      <p style={{ marginTop: "0.75rem", maxWidth: "28rem", lineHeight: 1.45 }}>
        Pick an RV Year, month, or chart week here soon. Return to search and add a year to
        your query — for example <strong>eagles 1976</strong> — to open RV History inline.
      </p>
    </main>
  );
}
