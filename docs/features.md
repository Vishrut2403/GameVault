# Features

## Game Library

Your full Steam library in one view, with filtering and sorting.

- Status tracking — Playing, Completed, Backlog, Unplayed
- 1–5 star ratings and personal reviews
- Custom tags per game
- Achievement progress bars
- Price-per-hour value tracking

---

## Analytics Dashboard

### Activity Heatmap
GitHub-style contribution graph showing 365 days of gaming activity. Click any square to see a breakdown of every game played that day.

### Gaming Profile Radar
Multi-dimensional chart across rating, completion rate, playtime, achievements, and value.

### Platform Distribution
Pie chart showing your library split across platforms.

### Playtime Analytics
Breakdowns by game, platform, and time period.

### Achievement Analytics
Completion rates, perfect games, and achievement progress.

### Value Analytics
Price-per-hour rankings, total spending, and best-value games.

---

## HowLongToBeat Integration

Every game modal shows three time estimates fetched from HLTB:
- **Main story** — core campaign only
- **Main + extras** — campaign plus side content
- **Completionist** — full 100% run

Steam games resolve via exact appId lookup. Data is cached in-memory per session.

---

## Recommendation System

Enter a budget and the system picks the optimal combination of wishlist games using a 0/1 knapsack algorithm.

Each game is scored across four dimensions:
- **Discount** (50%) — sale percentage
- **Value** (30%) — HLTB completionist hours ÷ current price (hrs/₹)
- **Tag match** (15%) — genre overlap with your library
- **Rating match** (5%) — average rating of similar genres you've played

HLTB data for wishlist games is fetched automatically on first run and stored in the database — subsequent runs are instant.

---

## Journal System

Write game-specific notes and progress logs. Each entry has an optional heading and freeform text. Entries display in chronological order per game.

---

## Session Tracking

Daily playtime is recorded per game on every sync. The heatmap and analytics views are powered by this session data. Sessions are created during sync operations — not real-time.

---

## Tier List

Drag games into S / A / B / C / D tiers. Visual display with game covers.

---

## Wishlist

Manual wishlist with:
- Custom list price, current price, and discount %
- Tags for genre matching
- Cover image URL
- Recommendation score (updated on each recommendation run)