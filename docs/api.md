# API Reference

All authenticated endpoints require:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/steam` | Initiate Steam OAuth |
| GET | `/api/auth/steam/callback` | Steam OAuth callback |

---

## User

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/user/profile` | Get user profile |
| PUT | `/api/user/profile` | Update profile |
| GET | `/api/user/library` | Get all games |
| GET | `/api/user/sessions` | Get session data |
| GET | `/api/user/activity` | Get daily activity (heatmap) |
| POST | `/api/user/disconnect-steam` | Disconnect Steam |

---

## Steam

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/steam/sync` | Sync Steam library |
| GET | `/api/steam/library/:steamId` | Get Steam games |

---

## HLTB

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hltb/steam/:appId` | Get HLTB data by Steam appId |
| GET | `/api/hltb/name/:gameName` | Get HLTB data by name (fallback) |

---

## Wishlist

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/wishlist` | Get wishlist |
| POST | `/api/wishlist` | Add game |
| POST | `/api/wishlist/item` | Add game (alias) |
| PATCH | `/api/wishlist/item/:id` | Update item |
| DELETE | `/api/wishlist/item/:id` | Delete item |
| GET | `/api/wishlist/recommendations` | Get recommendations |
| POST | `/api/wishlist/sync` | Sync from your Steam wishlist now (429 with `nextSyncAt` within 10 minutes of the last sync) |

---

## Recommendations

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/recommendations/:userId/optimize` | Run knapsack optimization |
| GET | `/api/recommendations/:userId/smart` | Ranked backlog picks (`?limit=`) |

---

## Predictions

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/predictions/:gameId` | Time-to-complete prediction for a game |
| GET | `/api/predictions/backlog-plan` | Finish date for each backlog game at your pace |
| GET | `/api/predictions/playstyle/current` | Your playstyle metrics |

---

## Journal

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/journal` | Get all entries |
| POST | `/api/journal` | Create entry |
| PUT | `/api/journal/:id` | Update entry |

---

