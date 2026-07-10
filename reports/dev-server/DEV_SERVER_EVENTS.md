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
## 2026-07-03T21:22:09.748Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 94867
- **childPid:** 94870
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-03T21:23:35.526Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 22886
- **childPid:** 22889
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-03T21:23:35.528Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 22465
- **childPid:** 22475
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-03T22:01:09.240Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 23991
- **childPid:** 23994
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-04T03:41:08.391Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 23953
- **childPid:** 23956
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-04T03:41:08.593Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 45663
- **childPid:** 45666
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-04T23:04:06.988Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 25589
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-04T23:23:11.317Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** live: stopped (was bobos-runtime)
## 2026-07-04T23:23:11.365Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** studio: stopped (was npm-dev)
## 2026-07-04T23:23:11.377Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 25589
- **childPid:** 25594
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-04T23:23:11.451Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 16490
- **childPid:** 16493
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-04T23:23:13.491Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 38063
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-04T23:23:13.592Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 38079
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-04T23:40:21.249Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 38079
- **childPid:** 38084
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T00:18:35.461Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 38063
- **childPid:** 38072
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T02:12:42.673Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 37879
- **childPid:** 37884
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T02:18:16.925Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 41313
- **childPid:** 41316
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T02:18:18.080Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 74244
- **childPid:** 74262
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T19:49:51.232Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** live: stopped (was bobos-runtime)
## 2026-07-05T19:49:51.267Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 10648
- **childPid:** 10658
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T19:49:51.283Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** studio: no-marker
## 2026-07-05T19:51:26.501Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** live: already-dead (was bobos-runtime)
## 2026-07-05T19:51:26.562Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** studio: already-dead (was bobos-runtime)
## 2026-07-05T22:57:44.417Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 18227
- **childPid:** 18239
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T22:57:44.742Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 18222
- **childPid:** 18238
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-05T23:00:29.395Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1305
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-05T23:00:34.863Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1341
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-06T06:53:22.372Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1305
- **childPid:** 1312
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-06T06:53:22.389Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1341
- **childPid:** 1348
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-06T19:15:55.080Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 2836
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-06T19:15:59.046Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 2895
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-10T04:38:42.018Z

- **event:** dev-exit
- **owner:** studio-launcher
- **wrapperPid:** 60825
- **childPid:** 60835
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (studio-launcher)
- **note:** next child exited
## 2026-07-10T04:39:23.059Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 14842
- **childPid:** 14845
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-10T07:01:17.079Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 17378
- **childPid:** 17385
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-10T07:01:49.517Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1201
- **childPid:** 1208
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T19:56:38.709Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1021
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-10T19:56:49.287Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1182
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-10T20:58:59.930Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1182
- **childPid:** 1195
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T20:58:59.982Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1021
- **childPid:** 1030
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T21:51:59.019Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1226
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-10T21:52:04.508Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 1318
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-10T22:02:04.906Z

- **event:** runtime-blocked-port-conflict
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** Port 3100 in use (owner=bobos-runtime) but health check failed.
## 2026-07-10T22:02:23.155Z

- **event:** runtime-blocked-port-conflict
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** Port 3100 in use (owner=bobos-runtime) but health check failed.
## 2026-07-10T22:02:34.573Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** live: stopped (was bobos-runtime)
## 2026-07-10T22:02:34.640Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1318
- **childPid:** 1325
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T22:02:34.658Z

- **event:** runtime-stop
- **owner:** bobos-runtime
- **wrapperPid:** —
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** —
- **note:** studio: stopped (was bobos-runtime)
## 2026-07-10T22:02:34.795Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 1226
- **childPid:** 1233
- **port:** 3000
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T22:02:36.918Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 3237
- **childPid:** —
- **port:** 3000
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app studio
- **note:** BobOS runtime spawned studio
## 2026-07-10T22:02:37.005Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 3254
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
## 2026-07-10T22:36:34.537Z

- **event:** dev-exit
- **owner:** bobos-runtime
- **wrapperPid:** 3254
- **childPid:** 3259
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (bobos-runtime)
- **note:** next child exited
## 2026-07-10T22:44:00.705Z

- **event:** dev-exit
- **owner:** npm-dev
- **wrapperPid:** 19014
- **childPid:** 19017
- **port:** 3100
- **exitCode:** 0
- **signal:** —
- **command:** node tools/next-dev.mjs (npm-dev)
- **note:** next child exited
## 2026-07-10T22:46:16.565Z

- **event:** runtime-start
- **owner:** bobos-runtime
- **wrapperPid:** 25275
- **childPid:** —
- **port:** 3100
- **exitCode:** —
- **signal:** —
- **command:** node tools/next-dev.mjs --app live
- **note:** BobOS runtime spawned live
