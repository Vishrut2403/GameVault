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

## Common Prism Launcher Paths

| OS | Path |
|---|---|
| Linux | `~/.local/share/PrismLauncher/instances` |
| Linux (Flatpak) | `~/.var/app/org.prismlauncher.PrismLauncher/data/PrismLauncher/instances` |
| Windows | `%APPDATA%\PrismLauncher\instances` |
| macOS | `~/Library/Application Support/PrismLauncher/instances` |