# Integrations

## Steam

Full OAuth integration. Connect via Profile → Steam → Connect Steam.

- Syncs your entire library automatically
- Tracks playtime, achievements, and last played
- Cover art from Steam CDN
- Price-per-hour calculation using price paid

---

## HowLongToBeat

No account or API key needed. Data is fetched from an unofficial third-party API.

- Steam games: resolved by exact Steam appId → reliable
- Wishlist games: resolved via Steam store search by name → then appId lookup

Data is cached in the database after the first fetch. To refresh stale HLTB data for a wishlist game, open Prisma Studio, find the game in `steam_wishlist`, and set the four HLTB columns to null.