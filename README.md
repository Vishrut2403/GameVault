# Game Vault

**Track. Analyze. Optimize your gaming library across multiple platforms.**

A comprehensive full-stack web application that unifies your gaming experience across Steam, RetroAchievements, Minecraft, and console emulators with advanced analytics, session tracking, and smart recommendations.

![Analytics Dashboard](https://img.shields.io/badge/Analytics-Dashboard-blue)
![Session Tracking](https://img.shields.io/badge/Session-Tracking-green)
![Multi Platform](https://img.shields.io/badge/Multi-Platform-orange)

> ⚠️ This project is not affiliated with Valve Corporation, Steam, or any other gaming platform mentioned.

---

## Screenshots
 
### Analytics Dashboard
![Analytics Dashboard](./screenshots/Analytics_Dashboard.png)
 
### Game Library
![Game Library](./screenshots/Dashboard.png)
 
### Recommendation
![Recommendations](./screenshots/Recommendations.png)

### Wishlist
![Wishlist](./screenshots/Wishlist.png)
 

---

## Motivation

Modern gamers use multiple platforms—Steam, retro emulators, Minecraft, and more—making it difficult to:
- **Track total playtime** across different platforms
- **Analyze gaming habits** and patterns over time
- **Optimize purchases** based on actual play value
- **Manage a unified library** when games are scattered everywhere

**This project solves that** by aggregating all platforms into a single analytics-driven dashboard, giving you complete visibility into your gaming life with features like GitHub-style activity heatmaps, session tracking, and intelligent recommendations.

---

## Core Highlights

- **Multi-platform game aggregation** – Steam, RetroAchievements, Minecraft, PCSX2, RPCS3, PPSSPP all in one place
- **Time-series session tracking system** – Daily playtime tracking with historical data and trend analysis
- **Advanced analytics suite** – GitHub-style activity heatmap, radar charts, platform distribution, achievement rates
- **Value metrics engine** – Calculate price-per-hour, identify best-value games, track spending patterns
- **Knapsack-based recommendation engine** – Smart wishlist recommendations using dynamic programming optimization
- **Unified journal system** – Keep notes and track progress across all platforms in one place

---

## Features

### Multi-Platform Support
- **Steam** – Full OAuth integration with automatic library sync
- **RetroAchievements** – Track achievements for retro games (PS2, PS3, PSP)
- **Minecraft** – Prism Launcher integration with world and advancement tracking
- **PCSX2** – PlayStation 2 emulator support
- **RPCS3** – PlayStation 3 emulator support  
- **PPSSPP** – PSP emulator support

### Advanced Analytics Dashboard
- **Gaming Activity Heatmap** – GitHub-style contribution graph showing daily playtime
- **Session Tracking** – Detailed daily playtime per game with clickable visualization
- **Gaming Profile Radar** – Multi-dimensional analysis (rating, completion, playtime, achievements, value)
- **Platform Distribution** – Visual breakdown of your library across platforms
- **Achievement Analytics** – Track completion rates and perfect games
- **Playtime Analytics** – Comprehensive playtime breakdowns and trends
- **Value Analytics** – Price per hour calculations and spending insights
- **Library Overview** – Complete statistics and status distribution

### Library Management
- **Unified Library** – All games from all platforms in one place
- **Smart Status Tracking** – Playing, Completed, Backlog, Unplayed
- **Achievement Progress** – Real-time tracking with progress bars
- **Custom Tags** – Organize games your way
- **Personal Reviews & Ratings** – 1-5 star system with written reviews
- **Price Tracking** – Calculate value per hour played

### Journal System
- **Game-Specific Entries** – Keep notes and progress logs for each game
- **Rich Text Support** – Write detailed entries with headings
- **Timeline View** – Chronological journal entries

### Wishlist & Recommendations
- **Steam Wishlist Integration** – Track discounts and prices
- **Smart Recommendations** – Budget optimizer using 0/1 knapsack algorithm
- **Genre Matching** – Personalized suggestions based on your library

### Minecraft Integration
- **Prism Launcher Support** – Automatic instance detection
- **World Tracking** – Track playtime per world
- **Achievement Sync** – Real advancement tracking
- **Datapack Support** – Custom advancement recognition

---

## Tech Stack

### Frontend
- **React 18** + TypeScript
- **Vite** – Lightning-fast build tool
- **TailwindCSS** – Utility-first styling
- **Recharts** – Analytics visualizations
- **Axios** – HTTP client with interceptors

### Backend
- **Node.js** + Express
- **TypeScript**
- **PostgreSQL 14+** – Relational database
- **Prisma ORM** – Type-safe database access
- **Passport.js** – Steam OAuth authentication
- **Steam Web API** – Library synchronization
- **RetroAchievements API** – Achievement tracking
- **Session Tracking Service** – Daily playtime analytics

---

## Prerequisites

- **Node.js 18+**
- **PostgreSQL 14+**
- **npm** or **yarn** 
- **Git**

### Required API Keys

1. **Steam API Key** (Required for Steam integration)
   - Go to https://steamcommunity.com/dev/apikey
   - Sign in with Steam
   - Register for API key
   - Copy the key

2. **RetroAchievements API Key** (Optional - for retro game tracking)
   - Go to https://retroachievements.org/controlpanel.php
   - Sign in
   - Find your API Key under "Keys" section
   - Copy the key

3. **Prism Launcher** (Optional - for Minecraft tracking)
   - Download from https://prismlauncher.org/
   - Install and create at least one instance

---

## Local Setup Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/Vishrut2403/GameVault.git
cd GameVault
```

---

### Step 2: Database Setup

#### Start PostgreSQL Service

**Linux (systemd):**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot
```

**macOS (Homebrew):**
```bash
brew services start postgresql@14
```

**Windows:**
- PostgreSQL should start automatically after installation
- Or use `services.msc` to start it manually

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Or if you set up a different user:
psql -U your_username
```

In the PostgreSQL prompt:
```sql
CREATE DATABASE gamevault;
\q
```

**Verify database was created:**
```bash
psql -U postgres -l
```

---

### Step 3: Backend Setup

#### Navigate to Backend Directory

```bash
cd backend
```

#### Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express, Prisma, TypeScript
- Passport.js for authentication
- bcrypt for password hashing
- And more...

#### Create Environment File

```bash
cp .env.example .env
```

If `.env.example` doesn't exist, create `.env` manually:

```bash
nano .env
# or
code .env
```

#### Configure Environment Variables

Edit `backend/.env` with your settings:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Database Connection
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/gamevault"

# IMPORTANT: Replace 'your_password' with your actual PostgreSQL password

# Steam API (REQUIRED)
STEAM_API_KEY=your_steam_api_key_here
STEAM_RETURN_URL=http://localhost:3001/api/auth/callback

# JWT Secret (REQUIRED - generate a secure random string)
JWT_SECRET=your_jwt_secret_here_minimum_32_characters

# RetroAchievements (OPTIONAL)
RA_USERNAME=your_ra_username
RA_API_KEY=your_ra_api_key

# Prism Launcher Path (OPTIONAL - auto-detected if not specified)
PRISM_LAUNCHER_PATH=/home/your_username/.local/share/PrismLauncher/instances
```

**Generate JWT Secret:**

```bash
# Linux/macOS
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as `JWT_SECRET` value.

**Common Prism Launcher Paths:**

- **Linux:** `~/.local/share/PrismLauncher/instances`
- **Flatpak:** `~/.var/app/org.prismlauncher.PrismLauncher/data/PrismLauncher/instances`
- **Windows:** `%APPDATA%\PrismLauncher\instances`
- **macOS:** `~/Library/Application Support/PrismLauncher/instances`

#### Run Database Migrations

```bash
npx prisma migrate dev
```

This will:
- Create all database tables
- Set up relationships
- Apply any pending migrations

**If migrations folder doesn't exist:**
```bash
npx prisma migrate dev --name init
```

#### Generate Prisma Client

```bash
npx prisma generate
```

#### Verify Database Schema

```bash
npx prisma studio
```

This opens a web UI at http://localhost:5555 where you can:
- View all tables
- Inspect the schema
- Manually add/edit data (useful for testing)

#### Start Backend Server

```bash
npm run dev
```

**Verify backend is running:**

Open browser to http://localhost:3001/health

You should see: `{"status":"ok"}`

---

### Step 4: Frontend Setup

Open a **new terminal** (keep backend running) and navigate to frontend:

```bash
cd frontend
```

#### Install Dependencies

```bash
npm install
```

This installs:
- React, Vite, TypeScript
- TailwindCSS
- Recharts for analytics
- Axios for API calls

#### Create Environment File

```bash
cp .env.example .env
```

#### Configure Frontend Environment

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001
```

#### Start Frontend Development Server

```bash
npm run dev
```

---

### Step 5: Access the Application

Open your browser and go to:

**http://localhost:5173**

---

## First Time Setup

### Create Your Account

1. Click **"Sign Up"** or **"Register"**
2. Enter your email and password
3. Click **"Create Account"**
4. You'll be logged in automatically

### Connect Steam (Recommended)

1. Click **"Sign in with Steam"** button
2. Authorize the application on Steam
3. Your Steam library will sync automatically
4. Wait a few seconds for games to import

### Connect RetroAchievements (Optional)

1. Go to **Profile** tab
2. Find RetroAchievements section
3. Enter your RA username
4. Enter your RA API key
5. Click **"Connect"**
6. Your achievements will sync

### Enable Emulators (Optional)

1. Go to **Profile** tab
2. Toggle on desired emulators:
   - PCSX2 (PlayStation 2)
   - RPCS3 (PlayStation 3)
   - PPSSPP (PSP)
3. Click sync to import games

### Add Minecraft Worlds (Optional)

1. Make sure Prism Launcher is installed
2. Create and launch at least one instance
3. In the app, click **"Add Minecraft World"**
4. Select your world from detected instances
5. Playtime and advancements will be tracked

---

## Using the Application

### Navigation Tabs

**Profile**
- View your gaming profile
- Connect/disconnect platforms
- Enable/disable emulators
- Configure auto-sync settings

**Journal**
- View all games in card layout
- Write journal entries for games
- Track your gaming journey

**Dashboard**
- Table view of all games
- Sort by name, playtime, price, rating
- Filter by status (Playing, Completed, Backlog)
- Edit game details inline

**Wishlist**
- Track games you want
- Monitor discounts and prices
- Add notes and priorities

**Recommendations**
- Get smart game suggestions
- Budget optimizer using 0/1 knapsack algorithm
- Based on your preferences and playtime patterns

**Analytics** (5 sub-tabs)
- **Dashboard** – Activity heatmap, overview stats
  - Click any green square to see games played that day
  - View gaming profile radar chart
  - Platform distribution pie chart
- **Playtime** – Detailed playtime breakdowns
- **Achievements** – Completion rates, perfect games
- **Value** – Price per hour, spending insights
- **Library** – Complete library statistics

**Tier List**
- Organize games by tier (S/A/B/C/D)
- Visual tier list display

---

## Gaming Activity Heatmap

The heatmap shows your gaming activity over the past year:

- **Green squares** = Days you played games
- **Intensity** = Number of games played that day
- **Click any day** → See detailed breakdown of games and hours
- **Hover** → Quick preview of playtime

### How Session Tracking Works

- Sessions are automatically created when games sync
- Tracks daily playtime per game
- Updates when you sync your library
- Historical data built from `lastPlayedAt` timestamps

**Note:** Session tracking captures data during sync operations, not real-time playtime. For best results, sync regularly!

---

## Troubleshooting

### Backend won't start

**Error: `ECONNREFUSED` or `Connection refused`**

- PostgreSQL is not running
- Solution:
  ```bash
  sudo systemctl status postgresql
  sudo systemctl start postgresql
  ```

**Error: Database `gamevault` does not exist**

- Database wasn't created
- Solution:
  ```bash
  psql -U postgres
  CREATE DATABASE gamevault;
  \q
  ```

**Error: Invalid `prisma.user` invocation**

- Migrations not run
- Solution:
  ```bash
  cd backend
  npx prisma migrate dev
  npx prisma generate
  ```

### Frontend won't start

**Error: `VITE_API_URL is not defined`**

- Missing `.env` file
- Solution: Create `frontend/.env` with `VITE_API_URL=http://localhost:3001`

**Error: `Cannot GET /`**

- Backend not running
- Solution: Start backend first: `cd backend && npm run dev`

### Steam OAuth fails

**Error: `Invalid return URL`**

- Check `STEAM_RETURN_URL` in backend `.env`
- Must be: `http://localhost:3001/api/auth/callback`
- Restart backend after changing

**Error: `Unauthorized`**

- Invalid Steam API key
- Get new key from https://steamcommunity.com/dev/apikey
- Update `STEAM_API_KEY` in `.env`
- Restart backend

### Minecraft not detected

**No instances showing**

1. Launch Prism Launcher
2. Create and launch an instance at least once
3. Check path is correct in `.env`
4. Default path: `~/.local/share/PrismLauncher/instances`

**Worlds not syncing**

1. Make sure instance has `.minecraft` or `minecraft` folder
2. Service checks both paths automatically
3. Verify saves exist in `/saves/` folder

### Session Tracking / Heatmap Issues

**Heatmap shows no data**

1. Check browser console (F12) for errors
2. Verify you're logged in (check for token in Local Storage)
3. Check backend logs for session endpoint calls
4. Sessions are created when games sync - sync your library

**401 Unauthorized on sessions**

1. Log out and log back in (get fresh token)
2. Check `JWT_SECRET` in backend `.env` is set
3. Restart backend after changing `.env`

**Sessions exist but heatmap empty**

1. Hard refresh browser: `Ctrl + Shift + R` (Windows/Linux) or `Cmd + Shift + R` (Mac)
2. Clear browser cache
3. Check console logs for date range issues

### Database Issues

**Reset database (WARNING: Deletes all data)**

```bash
cd backend
npx prisma migrate reset
```

**View database in GUI**

```bash
npx prisma studio
```

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly (both frontend and backend)
5. Commit with clear messages: `git commit -m 'Add feature'`
6. Push to your fork: `git push origin feature-name`
7. Open a Pull Request

### Code Style

- Use TypeScript for type safety
- Follow existing code patterns
- Add comments for complex logic
- Test before committing

---

## API Documentation

### Main Endpoints

**Authentication:**
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/steam` - Initiate Steam OAuth
- `GET /api/auth/callback` - Steam OAuth callback

**User:**
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `GET /api/user/library` - Get all games
- `GET /api/user/sessions` - Get session data
- `POST /api/user/connect-ra` - Connect RetroAchievements
- `POST /api/user/disconnect-steam` - Disconnect Steam

**Steam:**
- `POST /api/steam/sync` - Sync Steam library
- `GET /api/steam/library/:steamId` - Get Steam games

**Minecraft:**
- `GET /api/minecraft/instances` - List Prism instances
- `POST /api/minecraft/add` - Add world to library

**Journal:**
- `GET /api/journal` - Get entries
- `POST /api/journal` - Create entry
- `PUT /api/journal/:id` - Update entry

**Wishlist:**
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add game

All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```
---

## Author

**Vishrut Sachan**

- GitHub: [@Vishrut2403](https://github.com/Vishrut2403)
- Project: [GameVault](https://github.com/Vishrut2403/GameVault)

---

## Disclaimer

This project is not affiliated with, endorsed by, or associated with Valve Corporation, Steam, RetroAchievements, or any other gaming platform or company mentioned. All trademarks and registered trademarks are the property of their respective owners.

---

## Support

If you encounter issues:

1. Check the Troubleshooting section
2. Search existing [GitHub Issues](https://github.com/Vishrut2403/GameVault/issues)
3. Open a new issue with:
   - Detailed description
   - Steps to reproduce
   - Error messages
   - Your environment (OS, Node version, etc.)

---

**Star this repository if you find it useful!**

Happy Gaming! 