/**
 * Dev instrumentation — full stack traces for Gallery runtime RangeError.
 * Loaded by Next.js on server startup.
 */

function firstAppFrame(stack: string | undefined): string | null {
  if (!stack) return null;
  const root = process.cwd();
  for (const line of stack.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;
    if (trimmed.includes(root) && !trimmed.includes("node_modules")) {
      return trimmed;
    }
  }
  return null;
}

function logErr(label: string, err: unknown) {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error("\n========== RETROVERSE INSTRUMENTATION ==========");
  console.error(`[${label}] ${e.name}: ${e.message}`);
  console.error("[first-application-frame]", firstAppFrame(e.stack) ?? "(none)");
  console.error("[full-stack]\n" + (e.stack ?? "(no stack)"));
  console.error("================================================\n");
}

export async function register() {
  if (process.env.NODE_ENV !== "development") return;

  process.on("unhandledRejection", (reason) => {
    logErr("instrumentation unhandledRejection", reason);
  });

  process.on("uncaughtException", (err) => {
    logErr("instrumentation uncaughtException", err);
  });
}
