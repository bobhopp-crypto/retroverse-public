import type { Readable } from "node:stream";

export function nodeReadableToWeb(
  stream: Readable,
): ReadableStream<Uint8Array> {
  let closed = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const cleanup = () => {
        stream.removeListener("data", onData);
        stream.removeListener("end", onEnd);
        stream.removeListener("error", onError);
      };
      const onData = (chunk: Buffer) => {
        if (closed) return;
        try {
          controller.enqueue(new Uint8Array(chunk));
        } catch {
          closed = true;
          cleanup();
          stream.destroy();
        }
      };
      const onEnd = () => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.close();
      };
      const onError = (error: Error) => {
        if (closed) return;
        closed = true;
        cleanup();
        controller.error(error);
      };
      stream.on("data", onData);
      stream.once("end", onEnd);
      stream.once("error", onError);
    },
    cancel() {
      closed = true;
      stream.removeAllListeners("data");
      stream.removeAllListeners("end");
      stream.removeAllListeners("error");
      stream.destroy();
    },
  });
}
