/**
 * Dev-only Node preload — full stack traces for RangeError / unhandledRejection.
 * Enabled via tools/next-dev.mjs (NODE_OPTIONS --require).
 */
"use strict";

Error.stackTraceLimit = Infinity;

const APP_ROOT = require("node:path").join(__dirname, "..");

function formatErr(err) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack ?? "(no stack)",
    };
  }
  return { name: "NonError", message: String(err), stack: "(no stack)" };
}

function firstAppFrame(stack) {
  if (!stack) return null;
  const lines = stack.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) continue;
    if (
      trimmed.includes("node_modules/next/") ||
      trimmed.includes("node_modules/react/") ||
      trimmed.includes("node:internal") ||
      trimmed.includes("node:async_hooks")
    ) {
      continue;
    }
    if (trimmed.includes(APP_ROOT) || trimmed.includes("/RETROVERSE_PUBLIC/")) {
      return trimmed;
    }
  }
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("at ") && !trimmed.includes("node:internal")) {
      return trimmed;
    }
  }
  return lines[1]?.trim() ?? null;
}

function findRepeatingCallSequence(stack) {
  if (!stack) return null;
  const frames = stack
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("at "));
  const counts = new Map();
  for (const f of frames) {
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  const repeated = [...counts.entries()]
    .filter(([, n]) => n > 3)
    .sort((a, b) => b[1] - a[1]);
  const firstAppRepeat = repeated.find(
    ([f]) => f.includes(APP_ROOT) || f.includes("/RETROVERSE_PUBLIC/"),
  );
  return {
    topRepeated: repeated.slice(0, 8),
    firstAppRepeat: firstAppRepeat ?? null,
  };
}

function logRuntimeError(label, err) {
  const info = formatErr(err);
  const repeat = findRepeatingCallSequence(info.stack);
  const appFrame = firstAppFrame(info.stack);

  console.error("\n========== RETROVERSE DEV RUNTIME ERROR ==========");
  console.error(`[${label}] ${info.name}: ${info.message}`);
  console.error("[first-application-frame]", appFrame ?? "(none found)");
  console.error("[full-stack]\n" + info.stack);
  if (repeat?.firstAppRepeat) {
    console.error(
      "[first-repeating-app-frame]",
      repeat.firstAppRepeat[0],
      `(×${repeat.firstAppRepeat[1]})`,
    );
  }
  if (repeat?.topRepeated?.length) {
    console.error("[top-repeated-frames]");
    for (const [frame, count] of repeat.topRepeated) {
      console.error(`  ×${count}  ${frame}`);
    }
  }
  console.error("==================================================\n");
}

process.on("unhandledRejection", (reason) => {
  logRuntimeError("unhandledRejection", reason);
});

process.on("uncaughtException", (err) => {
  logRuntimeError("uncaughtException", err);
});

const origConsoleError = console.error.bind(console);
console.error = (...args) => {
  origConsoleError(...args);
  for (const arg of args) {
    if (arg instanceof Error && arg.name === "RangeError") {
      logRuntimeError("console.error RangeError", arg);
    }
    if (typeof arg === "string" && arg.includes("Maximum call stack size exceeded")) {
      origConsoleError("[retroverse-dev] RangeError message detected in console.error args");
    }
  }
};

process.env.RETROVERSE_GALLERY_TRACE = process.env.RETROVERSE_GALLERY_TRACE ?? "1";
