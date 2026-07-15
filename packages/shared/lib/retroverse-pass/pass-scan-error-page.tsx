type Props = { message: string };

/** Error shell for pass scans that never reach the claim overlay. */
export function PassScanErrorPage({ message }: Props) {
  return (
    <main
      style={{
        margin: 0,
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.25rem",
        background: "#171f22",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#fffaf0",
          color: "#2d3e46",
          border: "3px solid #2d3e46",
          borderRadius: 18,
          padding: "1.75rem",
          boxShadow: "8px 8px 0 rgba(18,52,58,0.35)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "0.78rem",
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#e07a4f",
          }}
        >
          Retroverse Pass
        </p>
        <h1
          style={{
            margin: "0.3rem 0 0.75rem",
            fontSize: "1.6rem",
            fontWeight: 900,
            lineHeight: 1.15,
          }}
        >
          Hold up
        </h1>
        <p
          style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.5 }}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    </main>
  );
}
