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

### This Week
The last 7 days at a glance: hours played against the week before, days played, how many games, and the most-played one.

### Activity Heatmap
GitHub-style contribution graph showing 365 days of gaming activity, shaded by hours played each day. Click any square to see a breakdown of every game played that day.

### Game Cover Wall and Completion Funnel
Your covers sorted by playtime, achievements or recency, and how many games you've started, played 10h+, completed and 100%'d.

### Achievement Analytics
Completion rates, perfect games, and achievement progress.

### Value Analytics
Price-per-hour rankings, total spending, and best-value games.

---

## Backlog Planner

When you'd finish each game you've marked as Backlog, at your own pace. It takes HowLongToBeat main-story time minus what you've already played, plays the backlog shortest first, gives each play day your usual daily playtime, and spreads play days over the calendar at the rate you actually play (from the last 30 days of sessions). Games are grouped by the month they'd be finished; games HowLongToBeat doesn't know are listed rather than guessed.

---

## Themes

A header button switches between the default dark theme and a neo-brutalist one (pastel grid background, black outlines, hard shadows, window-style panels). The choice is remembered per browser.

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

Your Steam wishlist, synced automatically every night (and with the Sync from Steam button):
- Current store prices in rupees, with the original price and discount % during a sale
- Games removed on Steam are removed here; an empty response (a private profile, or Steam being down) never removes anything
- Two Steam requests per sync however long the wishlist is, sent with the app's Steam API key, so it stays clear of Steam's rate limits
- The sync buttons refresh the wishlist at most once every 10 minutes; the Wishlist page's button greys out with a countdown until then. The nightly sync always runs
- Your Steam profile's game details must be public for the wishlist to be readable

Games that aren't on Steam can still be added by hand, with:
- Custom list price, current price, and discount %
- Tags for genre matching
- Cover image URL

A hand-added game with the same name as one on your Steam wishlist is taken over by the synced entry at the next sync, keeping its tags.

Every entry has a recommendation score, updated on each recommendation run.