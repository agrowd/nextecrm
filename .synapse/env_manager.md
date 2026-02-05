# 🌍 ENVIRONMENT CONTEXT

## [L] LOCAL (Dev - Windows)
- **Runtime:** Node.js native or Docker Desktop.
- **DB:** MongoDB Atlas (Cloud) via `.env`.
- **Ports:** 4000 (app), 8485 (dashboard).
- **Auth:** `LocalAuth` (Sessions in `./sessions` or `./.wwebjs_auth`).

## [P] PRODUCTION (VPS - Debian)
- **Runtime:** Docker Compose (`docker-compose.yml`).
- **DB:** MongoDB Atlas.
- **Volumes:** Bind mounts for sessions (`/srv/rascafull/bot_X/sessions:/app/bot_X/sessions`).
- **Critical:** 
  - **Do NOT** commit `package-lock.json` if it contains SSH git protocols.
  - **Always** rebuild (`--build`) when changing `package.json` dependencies.
  - **Clean** session folders manually (`rm -rf`) if `authenticated` loop occurs.

## 🚨 VPS Deployment Workflow (CORRECT)
```bash
cd /srv/rascafull
git pull
docker compose down
# ⚠️ NEVER use "docker compose build bot_2" - THAT SERVICE DOESN'T EXIST!
docker compose build --no-cache   # Rebuilds the ONLY service: "app"
docker compose up -d
docker compose logs -f
```

## Folder Mapping (Dockerfile -> VPS)
| Local Folder | VPS Path | Bot Name |
|:---|:---|:---|
| `./bot/` | `/app/bot/` | Bot 1 (Primary) |
| `./bot_2/` | `/app/bot_2/` | Bot 2 |
| `./bot_3/` | `/app/bot_3/` | Bot 3 |
| `./bot_1/` | **NOT USED** | Local duplicate only |
