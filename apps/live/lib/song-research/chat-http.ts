import "server-only";
import { parseChatRequest } from "./chat-contract";
import type { OfflineChatResponse } from "./offline-chat-service";
import { productionChatService } from "./production-chat";

const BODY_LIMIT = 131072;
type Service = (raw: string, options: { signal: AbortSignal }) => Promise<OfflineChatResponse>;
const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function bounded<T>(start: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(Error("cancelled")); return; }
    const abort = () => reject(Error("cancelled")); signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => { if (signal.aborted) throw Error("cancelled"); return start(); })
      .then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
/** Bounded HTTP boundary; injectable only in server tests, never from HTTP input. */
export function createChatPostHandler(service: Service) {
  return async (request: Request): Promise<Response> => {
    const controller = new AbortController(), abort = () => controller.abort();
    const timer = setTimeout(abort, 9500); let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    request.signal.addEventListener("abort", abort, { once: true });
    try {
      if (request.signal.aborted) return json({ status: "cancelled" }, 499);
      if (request.method !== "POST") return json({ status: "invalid" }, 405);
      if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers.get("content-type") || "")) return json({ status: "invalid" }, 415);
      const origin = request.headers.get("origin");
      if (origin !== null && origin !== new URL(request.url).origin) return json({ status: "invalid" }, 403);
      const length = request.headers.get("content-length");
      if (length !== null && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) return json({ status: "invalid" }, 413);
      if (!request.body) return json({ status: "invalid" }, 400);
      reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
      for (;;) {
        const part = await bounded(() => reader!.read(), controller.signal); if (part.done) break;
        total += part.value.byteLength; if (total > BODY_LIMIT) return json({ status: "invalid" }, 413);
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(total); let at = 0; for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!parseChatRequest(JSON.parse(raw))) return json({ status: "invalid" }, 400);
      const result = await bounded(() => service(raw, { signal: controller.signal }), controller.signal);
      return json(result.body, result.status);
    } catch { return json({ status: controller.signal.aborted ? "timeout" : "invalid" }, controller.signal.aborted ? 504 : 400); }
    finally { clearTimeout(timer); request.signal.removeEventListener("abort", abort); if (reader) void reader.cancel().catch(() => {}); }
  };
}

// Missing runtime configuration is OFF. The server-only composition additionally
// requires the exact approved project, dedicated key and accepted $20 policy.
// No environment or credentials are read during import/build.
export const songChatPost = createChatPostHandler(productionChatService);
