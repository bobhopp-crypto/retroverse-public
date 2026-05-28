import { createHash } from "node:crypto";

export function hashBuffer(buf: Buffer): string {
  return createHash("md5").update(buf).digest("hex");
}

/** Best-effort dimensions without native deps. */
export function probeImageDimensions(buf: Buffer): {
  width: number | null;
  height: number | null;
} {
  if (buf.length > 24 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xff) break;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker === 0xc0 || marker === 0xc2) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
      i += 2 + len;
    }
  }
  if (
    buf.length > 24 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  return { width: null, height: null };
}

export function detectImageExt(buf: Buffer): string {
  if (buf[0] === 0xff && buf[1] === 0xd8) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49) return "gif";
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF") return "webp";
  return "jpg";
}

export function validateImageBytes(buf: Buffer): { ok: true } | { ok: false; message: string } {
  if (buf.length < 4_000) {
    return { ok: false, message: "Image too small (<4KB)." };
  }
  if (buf.length > 12_000_000) {
    return { ok: false, message: "Image too large (>12MB)." };
  }
  const { width, height } = probeImageDimensions(buf);
  if (width != null && height != null && (width < 200 || height < 200)) {
    return { ok: false, message: `Image dimensions too small (${width}×${height}).` };
  }
  return { ok: true };
}
