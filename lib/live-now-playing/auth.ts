export function verifyLiveNowPlayingSecret(req: Request): boolean {
  const secret = process.env.LIVE_NOW_PLAYING_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }

  const auth = req.headers.get("authorization")?.trim() ?? "";
  if (auth === `Bearer ${secret}`) return true;

  const header = req.headers.get("x-live-now-playing-secret")?.trim() ?? "";
  return header === secret;
}
