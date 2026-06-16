/**
 * Minimal OSC encode/decode for VirtualDJ bridge — no external deps.
 */

export function pad4(n: number): number {
  return (4 - (n % 4)) % 4;
}

export function encodeOscMessage(address: string, args: Array<string | number | boolean> = []): Buffer {
  const chunks: Buffer[] = [];

  const addr = Buffer.from(`${address}\0`);
  chunks.push(addr, Buffer.alloc(pad4(addr.length)));

  let tags = ",";
  const argBufs: Buffer[] = [];
  for (const arg of args) {
    if (typeof arg === "string") {
      tags += "s";
      const s = Buffer.from(`${arg}\0`);
      argBufs.push(s, Buffer.alloc(pad4(s.length)));
    } else if (typeof arg === "boolean") {
      tags += arg ? "T" : "F";
    } else if (typeof arg === "number") {
      if (Number.isInteger(arg)) {
        tags += "i";
        const b = Buffer.alloc(4);
        b.writeInt32BE(arg);
        argBufs.push(b);
      } else {
        tags += "f";
        const b = Buffer.alloc(4);
        b.writeFloatBE(arg);
        argBufs.push(b);
      }
    }
  }

  const tag = Buffer.from(`${tags}\0`);
  chunks.push(tag, Buffer.alloc(pad4(tag.length)), ...argBufs);
  return Buffer.concat(chunks);
}

export type OscMessage = {
  address: string;
  args: Array<string | number | boolean | null>;
};

function readPaddedString(buf: Buffer, offset: number): { value: string; next: number } {
  let end = offset;
  while (end < buf.length && buf[end] !== 0) end += 1;
  const value = buf.subarray(offset, end).toString("utf8");
  end += 1;
  const next = end + pad4(end - offset);
  return { value, next };
}

function decodeOne(buf: Buffer, offset = 0): OscMessage | null {
  if (offset >= buf.length) return null;

  const addr = readPaddedString(buf, offset);
  if (!addr.value.startsWith("/")) return null;

  let pos = addr.next;
  if (pos >= buf.length) {
    return { address: addr.value, args: [] };
  }

  const tags = readPaddedString(buf, pos);
  pos = tags.next;
  const args: OscMessage["args"] = [];

  for (const tag of tags.value.slice(1)) {
    if (pos + 4 > buf.length && tag !== "T" && tag !== "F") break;
    if (tag === "s") {
      const s = readPaddedString(buf, pos);
      args.push(s.value);
      pos = s.next;
    } else if (tag === "i") {
      args.push(buf.readInt32BE(pos));
      pos += 4;
    } else if (tag === "f") {
      args.push(buf.readFloatBE(pos));
      pos += 4;
    } else if (tag === "T") {
      args.push(true);
    } else if (tag === "F") {
      args.push(false);
    } else {
      args.push(null);
    }
  }

  return { address: addr.value, args };
}

/** Decode OSC packet — handles single messages and #bundle. */
export function decodeOscPacket(buf: Buffer): OscMessage[] {
  if (buf.length < 4) return [];
  const head = buf.subarray(0, 16).toString("utf8");
  if (head.startsWith("#bundle")) {
    const out: OscMessage[] = [];
    let pos = 16;
    while (pos + 4 <= buf.length) {
      const size = buf.readInt32BE(pos);
      pos += 4;
      if (size <= 0 || pos + size > buf.length) break;
      const msg = decodeOne(buf, pos);
      if (msg) out.push(msg);
      pos += size;
    }
    return out;
  }
  const one = decodeOne(buf, 0);
  return one ? [one] : [];
}

export function vdjScriptToOscPath(prefix: "query" | "subscribe", script: string): string {
  const parts = script.trim().split(/\s+/).filter(Boolean);
  return `/vdj/${prefix}/${parts.join("/")}`;
}

export function vdjQueryPath(script: string, force?: "text" | "bool"): string {
  const parts = script.trim().split(/\s+/).filter(Boolean);
  if (force) {
    return `/vdj/query/(${force})/${parts.join("/")}`;
  }
  return vdjScriptToOscPath("query", script);
}
