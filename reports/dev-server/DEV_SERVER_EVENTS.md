# Dev Server Events

Unexpected dev server lifecycle events (auto-appended by `tools/next-dev.mjs`).

| Field | Meaning |
|---|---|
| event | `dev-exit`, `dev-child-signal`, `dev-spawn-error`, `studio-blocked-port-conflict`, `verify-probe-failed` |
| owner | `npm-dev`, `studio-launcher`, `live-now-playing` |
| wrapperPid | `next-dev.mjs` process |
| childPid | `next dev` process |
| exitCode / signal | Why the process ended |

---

## Sprint 3.16 — initial audit

- **2026-06-27** — Investigation found `studio-launcher` and `live-stop` as confirmed killers of foreign dev servers.
- Monitor hook installed in `tools/next-dev.mjs`.
- Run `npm run dev:verify-isolation` with dev already up to validate background job isolation.

Events below are appended automatically at runtime.
## 2026-06-27T05:12:02.649Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 38107
- **childPid:** 38117
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-27T21:42:16.007Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-27T21:43:22.376Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-27T21:43:24.239Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-27T21:43:31.577Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-27T21:43:34.393Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-27T21:44:55.529Z

- **event:** verify-probe-failed
- **owner:** —
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** research:studio:production --limit 1
- **note:** during research:studio:production --limit 1
## 2026-06-28T08:16:38.255Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 64120
- **childPid:** 64123
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T08:49:54.784Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 74789
- **childPid:** 74792
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T08:51:21.119Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 55981
- **childPid:** 55984
- **port:** 3001
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T08:51:22.465Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 80138
- **childPid:** 80142
- **port:** 3002
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T08:51:23.583Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 26724
- **childPid:** 26728
- **port:** 3003
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T20:51:15.760Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 5119
- **childPid:** 5122
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-28T20:54:40.097Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 6277
- **childPid:** 6280
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-29T00:56:35.566Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 87355
- **childPid:** 87365
- **port:** 3005
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-29T00:56:35.573Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 22856
- **childPid:** 22859
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T00:18:41.461Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 24008
- **childPid:** 24011
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T19:28:31.808Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 85878
- **childPid:** 85881
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T19:58:26.143Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 19840
- **childPid:** 19843
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T20:00:46.304Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 37877
- **childPid:** 37887
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T20:05:03.850Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 41295
- **childPid:** 41298
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-06-30T20:09:05.268Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 44832
- **childPid:** 44835
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-01T13:33:32.887Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 34050
- **childPid:** 34053
- **port:** 3011
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-01T13:42:01.410Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 46744
- **childPid:** 46754
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-01T20:48:59.107Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 33411
- **childPid:** 33414
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-01T21:23:36.896Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 80667
- **childPid:** 80670
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-02T15:43:00.869Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 98956
- **childPid:** 98959
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
