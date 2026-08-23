# Retroverse local Jukebox bridge

This Hammerspoon module polls only the authenticated Mac-local Jukebox endpoint and writes `JUKEBOX REQUESTS.m3u` with exact VirtualDJ media paths. The Studio server writes the same M3U immediately after each valid request. Public requests first cross the minimal Neon relay, then the Mac imports them into the same canonical local ledger. No local path, LAN address, guest detail, BobOS detail, Hammerspoon detail, or VirtualDJ detail is sent to the public relay.

## One-time setup

1. Set a strong `RETROVERSE_REQUEST_BRIDGE_TOKEN` for the Studio server and use the same value in `~/.hammerspoon/retroverse_requests.json`.
2. Copy `retroverse_requests.lua` to `~/.hammerspoon/retroverse_requests.lua`.
3. Add this isolated load after the existing bingo code in `~/.hammerspoon/init.lua`:

   ```lua
   local requestsOk, requestsModule = pcall(require, "retroverse_requests")
   if requestsOk then
     retroverseRequests = requestsModule
   else
     hs.printf("Retroverse request bridge was not loaded: %s", tostring(requestsModule))
   end
   ```

4. Copy `JUKEBOX REQUESTS.vdjfolder` to VirtualDJ's `Folders` directory. It uses VirtualDJ's supported `FavoriteFolder` XML shape and does not modify `database.xml`. Add `JUKEBOX REQUESTS` as its own line in that directory's `order` file.
5. Reload Hammerspoon once.

## Event operation

1. Open BobOS Cockpit on the Mac and use the **SONG REQUESTS** panel.
2. Start a Jukebox session. Every new session starts with requests **OFF**.
3. Turn **SONG REQUESTS ON** only when guests may submit. This opens both the local iPad route and the public `REQUEST A SONG` experience. Turning it **OFF** closes both entry points without changing the current M3U.
4. In VirtualDJ, expand **JUKEBOX REQUESTS** and open `JUKEBOX REQUESTS.m3u`.
5. End the Jukebox session after the event. Ending it closes request entry but retains the session history.

The local iPad route is shown in the Cockpit panel and uses the Mac's current LAN address. It remains available when the internet or public relay is unavailable. The public route can fail independently without blocking the local route.

## Bridge controls

From the Hammerspoon console:

- Start: `retroverseRequests.enable()`
- Stop: `retroverseRequests.disable()`
- Poll now: `retroverseRequests.pollNow()`
- Verify: `retroverseRequests.status()`

The default endpoint is `http://127.0.0.1:3000/api/jukebox/accepted`. The enabled state persists in the JSON config. Local API failures leave the last complete M3U untouched. The bridge rewrites the playlist only when request IDs or paths change, using a temporary file followed by an atomic rename.

VirtualDJ reads the M3U as a normal list but may not repaint an already-open list after another process updates it. Click **JUKEBOX REQUESTS**, then `JUKEBOX REQUESTS.m3u` again to refresh the visible rows. The bridge intentionally does not click or control VirtualDJ and there is no ACCEPT, moderation, autoplay, or play-state queue.
