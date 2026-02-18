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
| D-11 | **🚨 Each bot folder has INDEPENDENT code copies** | `bot_2/`, `bot_3/`, `bot_4/` each have their own `services/` folder. Fixes to `bot/` do NOT automatically apply to other bots. Must update ALL bot folders when fixing shared logic. | 🔒 LOCKED |
| D-12 | **Anti-Spam URLs** | Replace `www.domain.com` with `domain dot com` and remove quotes to avoid WhatsApp banning for suspicious links. | 🔒 LOCKED |
| D-13 | **Anniversary Promo & Urgency** | Add "SOLO HOY" urgency to promos for anniversary, and offer calls in CTAs to increase conversion. | 🟢 ACTIVE |
| D-14 | **Smart Sleep Loop (No Dead Time)** | Replaced random sleep interval with `RateLimiter.canSendNow()` polling. Bot sleeps exactly `nextAvailable - now` ms. Reduces 30min dead times to 0. | 🔒 LOCKED |
| D-15 | **Robust Phone Validator** | Changed validator to detect if number already starts with `549` or `54` before adding prefix. Fixes bug where valid numbers became invalid (15 digits). | 🔒 LOCKED |
| D-16 | **Auto-Delete Duplicates in Fix Scripts** | When a fix script (like `fix-all-leads.js`) tries to update a phone number to one that ALREADY exists, it DELETES the redundant entry instead of erroring out. Prioritizes clean data over keeping garbage. | 🔒 LOCKED |
| D-17 | **Scripts Load Local .env** | Maintenance scripts must load `.env` from their local directory (`server/.env`) to access production keys (Atlas), overriding default localhost fallbacks used for dev. | 🔒 LOCKED |
| D-18 | **🚨 session_dead Detection in quickVerify** | Inner catch blocks of `isRegisteredUser` and `getNumberId` must check for 'detached', 'Target closed', 'Session closed' and return `session_dead` immediately. Prevents fallthrough to `quick_not_registered` which burns leads. | 🔒 LOCKED |
| D-19 | **🚨 Message History Check (NOT sendMessage trial)** | When quickVerify returns false, check last 100 messages via `fetchMessages()`. `sendMessage('.')` is WRONG: it creates chats for ANY number, even invalid ones. If we already sent messages → mark `contacted`. If no history → mark `check_failed`. | 🔒 LOCKED |
| D-20 | **In-Memory Lead Tracking for Response Detection** | Store `currentlyProcessingLead` with `stopSending` flag. Message handler checks incoming messages against this (resolving LID → real number). Avoids broken HTTP `/leads?search=` lookup. | 🔒 LOCKED |
| D-21 | **🤖 Auto-Reply Detection Before Sequence Abort** | WhatsApp Business auto-replies (menus, welcome messages) must NOT abort the message sequence. `isQuickAutoReply()` checks keywords, structure (3+ `?`, numbered emojis), and timing (<5s response on long messages). Only real human responses trigger abort. | 🔒 LOCKED |
