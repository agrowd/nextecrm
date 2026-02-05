# 🛡️ DECISION LOG (WHY WE DO IT)
| ID | Decisión Técnica | La Razón (The Why) | Estado |
|:---|:---|:---|:---|
| D-01 | **`headless: "shell"` in Docker** | Prevent Chromium crashes and `Target closed` errors in containerized environments. | 🔒 LOCKED |
| D-02 | **Use git master for whatsapp-web.js** | All bots must use `git+https://github.com/pedroslopez/whatsapp-web.js.git` to get latest fixes for WAPhoneUtils and other WA Web changes. | 🔒 LOCKED |
| D-03 | **Remove `.wwebjs_auth` from code** | Prevents `Code 21` (Profile Lock) by not copying auth data to Docker image layer. | 🔒 LOCKED |
| D-04 | **Monkey Patch `LocalAuth` logout** | Prevent EBUSY errors on Windows when unlocking session files during logout/restart. | 🟢 ACTIVE |
| D-05 | **Explicit HTTPS git URLs** | Hosting providers block SSH git clones without keys; force HTTPS for reliability. | 🟢 ACTIVE |
| D-06 | **🚨 Rebuild ENTIRE `app` service, NOT bot_X** | `docker-compose.yml` has ONE service called `app`. The command `docker compose build bot_2` FAILS SILENTLY. Always use `docker compose build --no-cache`. | 🔒 LOCKED |
| D-07 | **Folder naming: `bot/` = Bot 1, `bot_2/` = Bot 2** | The Dockerfile copies `bot/` (not `bot_1/`). The folder `bot_1/` in the repo is a LOCAL DUPLICATE and NOT USED in production. Bot 1 runs from `/app/bot/index.js`. | 🔒 LOCKED |
| D-08 | **Bot 1 works because of CACHED SESSION** | `bot/` uses git master which has latest fixes. It works because it uses the development branch. | 🔒 LOCKED |
| D-09 | **🚨 npm v1.34.6 does NOT fix WAPhoneUtils** | The npm package v1.34.6 does NOT have the WAPhoneUtils fix. Must use git master: `git+https://github.com/pedroslopez/whatsapp-web.js.git` | 🔒 LOCKED |
| D-10 | **Timezone bug in rateLimiter.js** | `getNextBusinessHour()` and `getSmartDelay()` were using UTC instead of Argentina time, causing `outside_business_hours` error during valid hours. Fixed to use `getArgentinaHour()` and `getArgentinaDay()`. | 🔒 LOCKED |\r\n| D-11 | **🚨 Each bot folder has INDEPENDENT code copies** | `bot_2/`, `bot_3/`, `bot_4/` each have their own `services/` folder. Fixes to `bot/` do NOT automatically apply to other bots. Must update ALL bot folders when fixing shared logic. | 🔒 LOCKED |
