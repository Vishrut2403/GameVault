# Setup Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Git

### API Keys

| Key | Required | Where to get it |
|---|---|---|
| Steam API Key | Yes | https://steamcommunity.com/dev/apikey |

---

## Database Setup

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew services start postgresql@14
```

**Create the database:**
```bash
psql -U postgres
CREATE DATABASE gamevault;
\q
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gamevault"

STEAM_API_KEY=your_steam_api_key_here
BACKEND_URL=http://localhost:3001

JWT_SECRET=your_jwt_secret_here
```

`BACKEND_URL` is the origin Steam redirects back to after login. It must match
the deployed origin exactly, or the OpenID round-trip fails.

Generate a JWT secret:
```bash
openssl rand -hex 32
```

Run migrations and start:
```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

Verify: http://localhost:3001/health

---

## Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:3001
```

Start:
```bash
npm run dev
```

Open: http://localhost:5173

---

## Nightly Sync

Play sessions are recorded per IST day by a nightly job that credits everything played since the last run to the day that just ended. It has to run at midnight IST: a run hours late credits the new day's early play to the day before.

Set `CRON_SECRET` (any long random string) in the backend environment, then add two jobs at [cron-job.org](https://cron-job.org), both with time zone **Asia/Kolkata**:

| Job | Schedule | Request |
|---|---|---|
| Wake | 23:50 daily | `GET <APP_URL>/health` |
| Nightly sync | 00:00 daily | `POST <APP_URL>/api/cron/daily-sync` with header `x-cron-secret: <CRON_SECRET>` |

The wake job matters on a host that sleeps idle services (Render's free tier sleeps after 15 minutes): cron-job.org gives up on a request after 30 seconds, which a cold start can exceed. Ten minutes later the service is still awake, and the sync itself takes a few seconds.

The GitHub workflow `.github/workflows/daily-sync.yml` calls the same endpoint as a fallback (repository secrets `APP_URL` and `CRON_SECRET`). GitHub often starts it hours late, so it only syncs users the on-time job didn't: each user's closed day is recorded, and a second call for the same day skips them. The response reports `synced`, `skipped` and `failed` counts.

---

## Common Prism Launcher Paths

| OS | Path |
|---|---|
| Linux | `~/.local/share/PrismLauncher/instances` |
| Linux (Flatpak) | `~/.var/app/org.prismlauncher.PrismLauncher/data/PrismLauncher/instances` |
| Windows | `%APPDATA%\PrismLauncher\instances` |
| macOS | `~/Library/Application Support/PrismLauncher/instances` |