export type PublishPayload = {
  filepath: string;
  artist: string;
  title: string;
  deck: number;
  timestamp: string;
};

export async function publishLiveTrack(
  apiUrl: string,
  apiSecret: string,
  payload: PublishPayload,
): Promise<{ ok: boolean; status: number; body: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiSecret) {
    headers.Authorization = `Bearer ${apiSecret}`;
  }

  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : "fetch failed",
    };
  }
}
