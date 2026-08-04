# Retroverse request bridge

This Hammerspoon module polls the authenticated accepted-request endpoint every 30 seconds and writes a standard M3U with the exact VirtualDJ media paths. It never reads or changes keyboard, mouse, PowerPoint, Keynote, or VirtualDJ controls.

## One-time setup

1. Run `docs/migrations/retroverse-song-requests.sql` against the pass-registration Postgres database.
2. Set the same strong `RETROVERSE_REQUEST_BRIDGE_TOKEN` on the public Live deployment and in `~/.hammerspoon/retroverse_requests.json`.
3. Copy `retroverse_requests.lua` to `~/.hammerspoon/retroverse_requests.lua`.
4. Add this isolated load after the existing bingo code in `~/.hammerspoon/init.lua`:

   ```lua
   local requestsOk, requestsModule = pcall(require, "retroverse_requests")
   if requestsOk then
     retroverseRequests = requestsModule
   else
     hs.printf("Retroverse request bridge was not loaded: %s", tostring(requestsModule))
   end
   ```

5. Copy `Retroverse Requests.vdjfolder` to VirtualDJ's `Folders` directory. It is the same supported `FavoriteFolder` XML shape already used by this installation; it does not modify `database.xml`. Add `Retroverse Requests` as its own line in that directory's `order` file so this installation displays the favorite in the browser tree.
6. Reload Hammerspoon once.

## Event controls

From the Hammerspoon console:

- Start: `retroverseRequests.enable()`
- Stop: `retroverseRequests.disable()`
- Poll now: `retroverseRequests.pollNow()`
- Verify: `retroverseRequests.status()`

The enabled state persists in the JSON config. Network or API failures leave the last complete M3U untouched. The bridge rewrites the playlist only when accepted request IDs or paths change, using a temporary file followed by an atomic rename.

Inside VirtualDJ, expand the **Retroverse Requests** favorite and open `Retroverse Requests.m3u`. Accepted requests appear there; played and skipped requests leave on the next successful poll.

VirtualDJ reads the supported M3U as a normal list but does not always repaint an already-open list when another process updates it. After a bridge poll, click **Retroverse Requests**, then click `Retroverse Requests.m3u` again to refresh the visible rows. The bridge intentionally does not click or control VirtualDJ.

## Tonight checklist

1. On a phone connected to the same Wi-Fi, open
   `http://Bobs-MacBook-Pro.local:3000/bobos/song-requests` and enter the normal
   BobOS PIN. If Bonjour is unavailable, run
   `tools/studio-service/studio-service.sh ip` and use the printed numeric-IP
   fallback.
2. Confirm the **Current event** title. Expand **Request catalog source** only if it needs changing.
3. Under **FOLDERS**, expand **VIDEO**, select **1960's**, confirm the preview count, then choose **Activate for this event**. Nested folders require explicit selection.
4. In the Hammerspoon console, run `retroverseRequests.enable()` and then `retroverseRequests.status()`. Verify `enabled = true`, `pollIntervalSeconds = 30`, and no error.
5. In VirtualDJ, expand **Retroverse Requests** and open `Retroverse Requests.m3u`.
6. After the event, run `retroverseRequests.disable()` and confirm `enabled = false` with `retroverseRequests.status()`.
