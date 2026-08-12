export type ParsedByteRange =
  | { ok: true; start: number; end: number; length: number }
  | { ok: false; status: 416; contentRange: string };

export function parseSingleByteRange(
  rangeHeader: string,
  fileSize: number,
): ParsedByteRange {
  const invalid: ParsedByteRange = {
    ok: false,
    status: 416,
    contentRange: `bytes */${Math.max(0, fileSize)}`,
  };
  if (!Number.isInteger(fileSize) || fileSize <= 0) return invalid;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return invalid;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return invalid;
    const length = Math.min(fileSize, suffixLength);
    return { ok: true, start: fileSize - length, end: fileSize - 1, length };
  }
  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : fileSize - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(requestedEnd) ||
    start < 0 ||
    start >= fileSize ||
    requestedEnd < start
  ) {
    return invalid;
  }
  const end = Math.min(requestedEnd, fileSize - 1);
  return { ok: true, start, end, length: end - start + 1 };
}

export function editingProxyMediaHeaders(options: {
  fileSize: number;
  etag: string;
  range?: { start: number; end: number };
}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=31536000, immutable",
    ETag: `"${options.etag}"`,
    "Content-Length": String(
      options.range
        ? options.range.end - options.range.start + 1
        : options.fileSize,
    ),
  };
  if (options.range) {
    headers["Content-Range"] = `bytes ${options.range.start}-${options.range.end}/${options.fileSize}`;
  }
  return headers;
}
