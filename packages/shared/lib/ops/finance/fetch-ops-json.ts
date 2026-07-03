export type OpsJsonError = {
  error: string;
  detail?: string;
  stack?: string;
};

export async function readOpsJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text.trim()) {
    throw new Error(`Empty server response (${res.status})`);
  }

  let data: T & OpsJsonError;
  try {
    data = JSON.parse(text) as T & OpsJsonError;
  } catch {
    throw new Error(
      `Server returned non-JSON (${res.status}): ${text.slice(0, 400).replace(/\s+/g, " ").trim()}`,
    );
  }

  if (!res.ok) {
    const parts = [data.error ?? data.detail ?? `Request failed (${res.status})`];
    if (data.detail && data.detail !== parts[0]) parts.push(data.detail);
    if (data.stack) parts.push(data.stack);
    throw new Error(parts.join("\n"));
  }

  return data;
}
