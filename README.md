# Game Vault

**Track. Analyze. Optimize your gaming library across multiple platforms.**

A full-stack web app that unifies Steam, RetroAchievements, RetroArch, Minecraft, and console emulators into a single analytics-driven dashboard — with session tracking, HowLongToBeat estimates, and intelligent budget recommendations.

![Analytics Dashboard](https://img.shields.io/badge/Analytics-Dashboard-blue)
![Multi Platform](https://img.shields.io/badge/Multi-Platform-orange)
![HLTB Integration](https://img.shields.io/badge/HowLongToBeat-Integrated-purple)
![RetroArch](https://img.shields.io/badge/RetroArch-Supported-red)

> ⚠️ Not affiliated with Valve, Steam, HowLongToBeat, RetroArch, or any other platform mentioned.

---

## What is this?

Modern gamers play across Steam, retro emulators, Minecraft, and more — making it impossible to track total playtime or analyze habits in one place. Game Vault solves that by aggregating everything into a single dashboard with GitHub-style activity heatmaps, value analytics, and smart wishlist recommendations.

---

## Key Features

- **Multi-platform library** — Steam, RetroAchievements, RetroArch, Minecraft, PCSX2, RPCS3, PPSSPP
- **RetroArch support** — Auto-detects games and playtime from local playlists and runtime logs across any installed core
- **HowLongToBeat integration** — Main story, main + extras, and completionist estimates on every game
- **Smart recommendations** — 0/1 knapsack algorithm scored by discount, HLTB hrs/₹ value, and your taste profile
- **Advanced analytics** — GitHub-style heatmap, session tracking, radar chart, platform distribution, price-per-hour
- **Unified journal** — Notes and progress logs for every game across all platforms
- **Auto-Sync** — Automatically sync all platforms after gaming sessions with a single click

---

## Screenshots

### Analytics Dashboard
![Analytics Dashboard](./screenshots/Analytics_Dashboard.png)

### Game Library
![Game Library](./screenshots/Dashboard.png)

### Wishlist
![Wishlist](./screenshots/Wishlist.png)

### Recommendations
![Recommendations](./screenshots/Recommendations.png)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Vishrut2403/GameVault.git
cd GameVault

# 2. Backend
cd backend
npm install
cp .env.example .env   # fill in your keys
npx prisma migrate dev
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:3001
npm run dev
```

Open **http://localhost:5173**

> You'll need Node.js 18+, PostgreSQL 14+, and a Steam API key to get started.
> See [docs/setup.md](./docs/setup.md) for the full setup guide.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 14+, Prisma ORM |
| Auth | JWT, Passport.js (Steam OAuth) |
| Integrations | Steam API, RetroAchievements API, RetroArch (local), HowLongToBeat (unofficial API) |

---

## Documentation

- [Setup Guide](./docs/setup.md) — prerequisites, env vars, database, running locally
- [Features](./docs/features.md) — detailed breakdown of every feature
- [Integrations](./docs/integrations.md) — Steam, RetroArch, HLTB, Minecraft and more
- [Troubleshooting](./docs/troubleshooting.md) — common errors and fixes
- [API Reference](./docs/api.md) — all backend endpoints

---

## Author

**Vishrut Sachan**
- GitHub: [@Vishrut2403](https://github.com/Vishrut2403)
- Project: [GameVault](https://github.com/Vishrut2403/GameVault)

---

## Disclaimer

This project is not affiliated with Valve, Steam, HowLongToBeat, RetroAchievements, RetroArch, or any other platform mentioned. HLTB data is fetched via an unofficial third-party API and may not always be complete or accurate.