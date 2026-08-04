local outputPath = "/private/tmp/Retroverse Requests.test.m3u"
local acceptedRequests = {
  {
    requestId = 41,
    artist = "The Turtles",
    title = "Happy Together",
    localMediaPath = "/Users/bobhopp/DJ MEDIA/VIDEO/1960's/The Turtles - Happy Together.mp4",
  },
}
local configuredInterval = nil
local pollingTimerCreations = 0
local storedConfig = {
  enabled = false,
  endpoint = "https://example.invalid/accepted",
  token = "test-token",
  outputPath = outputPath,
  notifications = false,
}

hs = {
  json = {
    read = function(_) return storedConfig end,
    write = function(value, _, _, _) storedConfig = value return true end,
    decode = function(_)
      return {
        eventId = "test-event",
        requests = acceptedRequests,
      }
    end,
  },
  fs = {
    attributes = function(path)
      if path == "/private" or path == "/private/tmp" then return {} end
      return nil
    end,
    mkdir = function(_) return true end,
  },
  http = {
    asyncGet = function(_, headers, callback)
      assert(headers.Authorization == "Bearer test-token")
      callback(200, "{}")
    end,
  },
  timer = {
    doEvery = function(interval, _)
      configuredInterval = interval
      pollingTimerCreations = pollingTimerCreations + 1
      return { stop = function() end }
    end,
  },
  notify = {
    new = function(_) return { send = function() end } end,
  },
  alert = { show = function(_, _) end },
}

local module = dofile("tools/song-request-bridge/retroverse_requests.lua")
module.enable()
module.enable()
assert(configuredInterval == 30)
assert(pollingTimerCreations == 1)

local file = assert(io.open(outputPath, "r"))
local content = file:read("*a")
file:close()

assert(content:find("#EXTM3U", 1, true))
assert(content:find("#EXTINF:-1,The Turtles - Happy Together", 1, true))
assert(content:find("/Users/bobhopp/DJ MEDIA/VIDEO/1960's/The Turtles - Happy Together.mp4", 1, true))
assert(not io.open(outputPath .. ".tmp", "r"))
assert(module.status().requestCount == 1)
assert(module.status().pollIntervalSeconds == 30)
assert(module.status().pollingTimerCount == 1)

acceptedRequests = {}
module.pollNow()
local emptied = assert(io.open(outputPath, "r"))
local emptiedContent = emptied:read("*a")
emptied:close()
assert(emptiedContent == "#EXTM3U\n")
assert(module.status().requestCount == 0)

module.disable()
assert(storedConfig.enabled == false)
assert(module.status().pollingTimerCount == 0)
os.remove(outputPath)

print("bridge test passed")
