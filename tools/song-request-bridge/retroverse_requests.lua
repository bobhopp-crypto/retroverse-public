-- Retroverse accepted-request bridge for Hammerspoon.
-- Polls only while explicitly enabled and writes one standard M3U atomically.

local M = {}

local home = os.getenv("HOME") or "/Users/bobhopp"
local configPath = home .. "/.hammerspoon/retroverse_requests.json"
local defaults = {
  enabled = false,
  endpoint = "https://retroverse.live/api/song-requests/accepted",
  token = "",
  outputPath = home .. "/RETROVERSE_DATA/virtualdj-requests/Retroverse Requests.m3u",
  notifications = true,
}

local timer = nil
local pollIntervalSeconds = 30
local lastContent = nil
local seenIds = {}
local completedFirstPoll = false
local statusState = {
  enabled = false,
  lastPollAt = nil,
  lastSuccessAt = nil,
  lastError = nil,
  requestCount = 0,
  pollIntervalSeconds = pollIntervalSeconds,
  pollingTimerCount = 0,
  outputPath = defaults.outputPath,
}

local function copyDefaults()
  local value = {}
  for key, item in pairs(defaults) do value[key] = item end
  return value
end

local function loadConfig()
  local config = copyDefaults()
  local stored = hs.json.read(configPath)
  if type(stored) == "table" then
    for key, value in pairs(stored) do
      if config[key] ~= nil then config[key] = value end
    end
  end
  return config
end

local function saveConfig(config)
  hs.json.write(config, configPath, true, true)
end

local function parentDirectory(path)
  return path:match("^(.*)/[^/]+$")
end

local function ensureDirectory(path)
  if not path or path == "" or path == "/" or hs.fs.attributes(path) then return true end
  local parent = parentDirectory(path)
  if parent and parent ~= path and not ensureDirectory(parent) then return false end
  local ok = hs.fs.mkdir(path)
  return ok or hs.fs.attributes(path) ~= nil
end

local function cleanM3uText(value)
  return tostring(value or ""):gsub("[\r\n]", " ")
end

local function buildM3u(requests)
  local lines = { "#EXTM3U" }
  for _, request in ipairs(requests) do
    local path = cleanM3uText(request.localMediaPath)
    if path:sub(1, 1) == "/" then
      table.insert(lines, "#EXTINF:-1," .. cleanM3uText(request.artist) .. " - " .. cleanM3uText(request.title))
      table.insert(lines, path)
    end
  end
  return table.concat(lines, "\n") .. "\n"
end

local function writeAtomic(path, content)
  local directory = parentDirectory(path)
  if not ensureDirectory(directory) then return false, "Could not create output directory." end
  local temporary = path .. ".tmp"
  local file, openError = io.open(temporary, "w")
  if not file then return false, openError end
  file:write(content)
  file:flush()
  file:close()
  local ok, renameError = os.rename(temporary, path)
  if not ok then return false, renameError end
  return true, nil
end

local function notifyNewRequests(requests, config)
  local nextSeen = {}
  local newRequests = {}
  for _, request in ipairs(requests) do
    local key = tostring(request.requestId)
    nextSeen[key] = true
    if completedFirstPoll and not seenIds[key] then table.insert(newRequests, request) end
  end
  seenIds = nextSeen
  if config.notifications and #newRequests > 0 then
    local latest = newRequests[#newRequests]
    hs.notify.new({
      title = "Retroverse Request Accepted",
      informativeText = cleanM3uText(latest.artist) .. " — " .. cleanM3uText(latest.title),
    }):send()
  end
  completedFirstPoll = true
end

local function poll()
  local config = loadConfig()
  statusState.enabled = config.enabled == true
  statusState.outputPath = config.outputPath
  statusState.lastPollAt = os.date("!%Y-%m-%dT%H:%M:%SZ")
  if not config.enabled then return end
  if config.endpoint == "" or config.token == "" then
    statusState.lastError = "Set endpoint and token in " .. configPath
    return
  end

  hs.http.asyncGet(config.endpoint, { Authorization = "Bearer " .. config.token }, function(code, body)
    if code ~= 200 then
      statusState.lastError = "HTTP " .. tostring(code)
      return
    end
    local payload = hs.json.decode(body)
    if type(payload) ~= "table" or type(payload.requests) ~= "table" then
      statusState.lastError = "Invalid bridge response"
      return
    end
    local content = buildM3u(payload.requests)
    if content ~= lastContent then
      local ok, writeError = writeAtomic(config.outputPath, content)
      if not ok then
        statusState.lastError = tostring(writeError or "M3U write failed")
        return
      end
      lastContent = content
    end
    notifyNewRequests(payload.requests, config)
    statusState.lastSuccessAt = os.date("!%Y-%m-%dT%H:%M:%SZ")
    statusState.lastError = nil
    statusState.requestCount = #payload.requests
  end)
end

local function stopTimer()
  if timer then
    timer:stop()
    timer = nil
  end
  statusState.pollingTimerCount = 0
end

local function startTimer()
  if timer then
    statusState.pollingTimerCount = 1
    return false
  end
  timer = hs.timer.doEvery(pollIntervalSeconds, poll)
  statusState.pollingTimerCount = 1
  poll()
  return true
end

function M.enable()
  local config = loadConfig()
  config.enabled = true
  saveConfig(config)
  statusState.enabled = true
  if startTimer() then hs.alert.show("Retroverse requests enabled") end
  return statusState
end

function M.disable()
  local config = loadConfig()
  config.enabled = false
  saveConfig(config)
  statusState.enabled = false
  stopTimer()
  hs.alert.show("Retroverse requests disabled")
  return statusState
end

function M.pollNow()
  poll()
end

function M.status()
  statusState.pollingTimerCount = timer and 1 or 0
  local message = statusState.enabled and "Retroverse requests: ON" or "Retroverse requests: OFF"
  message = message .. "\nAccepted: " .. tostring(statusState.requestCount)
  if statusState.lastSuccessAt then message = message .. "\nLast success: " .. statusState.lastSuccessAt end
  if statusState.lastError then message = message .. "\nError: " .. statusState.lastError end
  hs.alert.show(message, 4)
  return statusState
end

local initialConfig = loadConfig()
statusState.enabled = initialConfig.enabled == true
statusState.outputPath = initialConfig.outputPath
if initialConfig.enabled then startTimer() end

return M
